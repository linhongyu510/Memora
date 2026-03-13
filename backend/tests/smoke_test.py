from __future__ import annotations

import asyncio
import os
import shutil
import sys
from pathlib import Path
from types import SimpleNamespace

import httpx
BACKEND_ROOT = Path(__file__).resolve().parents[1]
TMP_ROOT = BACKEND_ROOT / ".tmp" / "smoke-test"


def assert_status(response: httpx.Response, expected_status: int) -> None:
    if response.status_code != expected_status:
        raise AssertionError(
            f"Expected status {expected_status}, got {response.status_code}: {response.text}"
        )


async def run_smoke_test() -> None:
    shutil.rmtree(TMP_ROOT, ignore_errors=True)
    TMP_ROOT.mkdir(parents=True, exist_ok=True)

    os.environ["DATABASE_URL"] = f"sqlite:///{(TMP_ROOT / 'memora.db').as_posix()}"
    os.environ["UPLOAD_DIR"] = ".tmp/smoke-test/uploads"
    os.environ["LLM_API_KEY"] = ""

    sys.path.insert(0, str(BACKEND_ROOT))

    from app.core.config import get_settings

    get_settings.cache_clear()

    from app import models  # noqa: F401
    from app.database import SessionLocal, init_db
    from app.main import UPLOADS_DIR, app
    from app.services.parsers.document import DocumentParser
    import app.services.parsers.document as document_parser_module
    import app.services.parsers.image as image_parser_module
    from app.services import summarizer as summarizer_module

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    init_db()

    transport = httpx.ASGITransport(app=app)

    try:
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            health = await client.get("/api/health")
            assert_status(health, 200)
            assert health.json()["status"] == "healthy"

            settings_before = await client.get("/api/settings")
            assert_status(settings_before, 200)
            settings_before_payload = settings_before.json()
            assert "llm_api_key_set" in settings_before_payload
            assert "llm_api_base" in settings_before_payload
            assert "llm_model" in settings_before_payload

            settings_after = await client.post(
                "/api/settings",
                json={
                    "llm_api_base": "https://example.test/v1",
                    "llm_model": "db-priority-model",
                    "llm_api_key": "db-priority-secret-key",
                },
            )
            assert_status(settings_after, 200)
            settings_payload = settings_after.json()
            assert settings_payload["llm_api_base"] == "https://example.test/v1"
            assert settings_payload["llm_model"] == "db-priority-model"
            assert settings_payload["llm_api_key_set"] is True
            assert settings_payload["llm_api_key_masked"]

            openai_module = __import__("openai")
            original_async_openai = openai_module.AsyncOpenAI
            calls: dict[str, str | None] = {}

            class FakeAsyncOpenAI:
                def __init__(self, *, api_key: str, base_url: str | None = None):
                    calls["api_key"] = api_key
                    calls["base_url"] = base_url
                    self.chat = SimpleNamespace(
                        completions=SimpleNamespace(create=self._create)
                    )

                async def _create(self, *, model, messages, temperature):
                    calls["model"] = model
                    calls["message_count"] = str(len(messages))
                    return SimpleNamespace(
                        choices=[
                            SimpleNamespace(
                                message=SimpleNamespace(
                                    content='{"title":"数据库配置生效","summary":"使用了 DB 中的 LLM 配置。","suggested_tags":["技术"],"category":"工作"}'
                                )
                            )
                        ]
                    )

            openai_module.AsyncOpenAI = FakeAsyncOpenAI
            try:
                db = SessionLocal()
                try:
                    llm_result = await summarizer_module.summarize("验证数据库配置优先级", db=db)
                finally:
                    db.close()
            finally:
                openai_module.AsyncOpenAI = original_async_openai

            assert llm_result.title == "数据库配置生效"
            assert calls["api_key"] == "db-priority-secret-key"
            assert calls["base_url"] == "https://example.test/v1"
            assert calls["model"] == "db-priority-model"

            # Patch parser-level PaddleOCR hooks to avoid heavy wheels in test env.
            paddle_calls: dict[str, int] = {"count": 0}

            def fake_extract_text_from_image_bytes(image_bytes: bytes) -> str:
                paddle_calls["count"] += 1
                return "PaddleOCR 识别文本"

            original_image_extract = image_parser_module.extract_text_from_image_bytes
            original_document_extract = document_parser_module.extract_text_from_image_bytes
            image_parser_module.extract_text_from_image_bytes = fake_extract_text_from_image_bytes
            document_parser_module.extract_text_from_image_bytes = fake_extract_text_from_image_bytes
            try:
                # Minimal PNG header to trigger image decode; the fake extractor ignores it.
                image_upload = await client.post(
                    "/api/upload",
                    files={
                        "file": (
                            "screenshot.png",
                            b"\\x89PNG\\r\\n\\x1a\\n",
                            "image/png",
                        )
                    },
                )
                assert_status(image_upload, 200)
                image_note = image_upload.json()
                assert image_note["media_type"] == "image"
                assert image_note["status"] in ("completed", "failed")
                assert paddle_calls["count"] >= 1

                import fitz

                doc = fitz.open()
                doc.new_page(width=320, height=240)
                blank_pdf_bytes = doc.tobytes()
                doc.close()

                document_parser = DocumentParser()
                scanned_result = await document_parser.extract(blank_pdf_bytes, "scan.pdf")
                assert scanned_result.media_type.value == "document"
                assert "PaddleOCR 识别文本" in scanned_result.raw_text

            finally:
                image_parser_module.extract_text_from_image_bytes = original_image_extract
                document_parser_module.extract_text_from_image_bytes = original_document_extract

            categories = await client.get("/api/categories")
            assert_status(categories, 200)
            assert categories.json() == []

            upload = await client.post(
                "/api/upload",
                files={
                    "file": (
                        "meeting-notes.txt",
                        "今天我们确认了交付节奏、测试范围和上线风险。".encode("utf-8"),
                        "text/plain",
                    )
                },
            )
            assert_status(upload, 200)
            note = upload.json()

            assert note["title"]
            assert note["status"] == "completed"
            assert note["media_type"] == "text"
            assert "测试范围" in (note["content"] or "")

            notes = await client.get("/api/notes")
            assert_status(notes, 200)
            notes_payload = notes.json()
            note_ids = {item["id"] for item in notes_payload}
            assert note["id"] in note_ids
            assert image_note["id"] in note_ids
            assert len(notes_payload) >= 2

            detail = await client.get(f"/api/notes/{note['id']}")
            assert_status(detail, 200)
            assert detail.json()["id"] == note["id"]

            tags = await client.get("/api/tags")
            assert_status(tags, 200)
            assert any(tag["name"] == "待整理" for tag in tags.json())

            uploaded_file_name = Path(note["original_path"]).name
            uploaded_file = await client.get(f"/api/files/{uploaded_file_name}")
            assert_status(uploaded_file, 200)
            assert uploaded_file.content

            print("Smoke tests passed: health, settings, upload, notes, tags, files")
    finally:
        await transport.aclose()
        shutil.rmtree(TMP_ROOT, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(run_smoke_test())
