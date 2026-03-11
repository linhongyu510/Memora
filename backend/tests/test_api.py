"""
后端 API 集成测试。
"""

import io
import time
import unittest

from fastapi.testclient import TestClient

from app.database import SessionLocal, init_db
from app.main import app
from app.services.bootstrap import seed_initial_taxonomy


class OmniNoteApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        db = SessionLocal()
        try:
            seed_initial_taxonomy(db)
        finally:
            db.close()
        cls.client = TestClient(app)

    def test_taxonomy_endpoints(self):
        categories_res = self.client.get("/api/categories")
        self.assertEqual(categories_res.status_code, 200)
        categories = categories_res.json()
        self.assertIsInstance(categories, list)
        self.assertGreaterEqual(len(categories), 1)

        tags_res = self.client.get("/api/tags")
        self.assertEqual(tags_res.status_code, 200)
        tags = tags_res.json()
        self.assertIsInstance(tags, list)
        self.assertGreaterEqual(len(tags), 1)

    def test_upload_and_poll_to_completed(self):
        content = "这是一段用于上传测试的文本内容，包含待办 todo。".encode("utf-8")
        files = {"files": ("integration_test.txt", io.BytesIO(content), "text/plain")}
        upload_res = self.client.post("/api/upload", files=files)
        self.assertEqual(upload_res.status_code, 200)

        payload = upload_res.json()
        self.assertEqual(payload["total"], 1)
        self.assertEqual(len(payload["results"]), 1)
        note_id = payload["results"][0]["note_id"]
        self.assertIsInstance(note_id, int)

        # 上传接口会立即返回 processing，后台任务稍后写入 completed。
        final_status = None
        for _ in range(20):
            poll_res = self.client.get(f"/api/notes/status?ids={note_id}")
            self.assertEqual(poll_res.status_code, 200)
            item = poll_res.json()["items"][0]
            final_status = item["status"]
            if final_status in {"completed", "failed"}:
                break
            time.sleep(0.2)

        self.assertIn(final_status, {"completed", "failed"})
        detail_res = self.client.get(f"/api/notes/{note_id}")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertEqual(detail["id"], note_id)
        self.assertIn(detail["status"], {"completed", "failed"})

    def test_notes_list_endpoint(self):
        notes_res = self.client.get("/api/notes")
        self.assertEqual(notes_res.status_code, 200)
        notes = notes_res.json()
        self.assertIsInstance(notes, list)


if __name__ == "__main__":
    unittest.main()

