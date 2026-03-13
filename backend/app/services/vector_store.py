"""
Vector indexing and semantic retrieval for notes using ChromaDB.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Note
from app.services.system_config import get_value


COLLECTION_NAME = "memora_notes"


def _backend_root() -> Path:
    from app.core.config import _BACKEND_DIR

    return _BACKEND_DIR


def _chroma_path() -> Path:
    settings = get_settings()
    chroma_dir = Path(settings.CHROMA_DIR)
    if chroma_dir.is_absolute():
        return chroma_dir
    return _backend_root() / chroma_dir


def _get_chroma_client():
    try:
        import chromadb
    except ImportError as exc:
        raise RuntimeError("ChromaDB 未安装，请先安装 backend/requirements.txt 中的 chromadb。") from exc

    path = _chroma_path()
    path.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(path))


def _get_collection():
    client = _get_chroma_client()
    return client.get_or_create_collection(name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"})


def _chunk_text(text: str, *, max_chars: int = 800, overlap: int = 120) -> list[str]:
    normalized = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not normalized:
        return []

    paragraphs = [part.strip() for part in normalized.split("\n\n") if part.strip()]
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) <= max_chars:
            candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
            if len(candidate) <= max_chars:
                current = candidate
                continue
            if current:
                chunks.append(current)
            current = paragraph
            continue

        if current:
            chunks.append(current)
            current = ""

        start = 0
        while start < len(paragraph):
            end = min(len(paragraph), start + max_chars)
            chunk = paragraph[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(paragraph):
                break
            start = max(0, end - overlap)

    if current:
        chunks.append(current)

    return chunks


def _deterministic_embedding(text: str, dimensions: int = 32) -> list[float]:
    values = [0.0] * dimensions
    tokens = [token for token in text.lower().split() if token]
    if not tokens:
        tokens = [text[:128] or "empty"]

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        for index in range(dimensions):
            values[index] += (digest[index % len(digest)] / 255.0) * 2 - 1

    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]


async def _embed_texts(texts: list[str], db: Session | None = None) -> list[list[float]]:
    settings = get_settings()

    api_key = (get_value(db, "embedding_api_key") if db is not None else None) or settings.EMBEDDING_API_KEY
    api_base = (get_value(db, "embedding_api_base") if db is not None else None) or settings.EMBEDDING_API_BASE
    model = (get_value(db, "embedding_model") if db is not None else None) or settings.EMBEDDING_MODEL

    if not api_key:
        return [_deterministic_embedding(text) for text in texts]

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key, base_url=api_base)
        response = await client.embeddings.create(model=model, input=texts)
        return [item.embedding for item in response.data]
    except Exception:
        return [_deterministic_embedding(text) for text in texts]


def _ids_for_note(note_id: int, count: int) -> list[str]:
    return [f"note-{note_id}-chunk-{index}" for index in range(count)]


async def index_note(note: Note, db: Session | None = None) -> dict[str, Any]:
    content = (note.content or note.summary or "").strip()
    if not content:
        return {"indexed": False, "reason": "empty-content"}

    chunks = _chunk_text(content)
    if not chunks:
        return {"indexed": False, "reason": "empty-chunks"}

    embeddings = await _embed_texts(chunks, db=db)
    collection = _get_collection()

    ids = _ids_for_note(note.id, len(chunks))
    try:
        collection.delete(ids=ids)
    except Exception:
        pass

    metadatas = [
        {
            "note_id": note.id,
            "chunk_index": index,
            "title": note.title,
            "media_type": note.media_type.value if hasattr(note.media_type, "value") else str(note.media_type),
        }
        for index in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    return {"indexed": True, "chunks": len(chunks)}


def schedule_index_note(note: Note) -> None:
    """
    Best-effort background indexing that should not block the upload response.
    """

    async def _runner() -> None:
        from app.database import SessionLocal

        db = SessionLocal()
        try:
            fresh_note = db.query(Note).filter(Note.id == note.id).first()
            if fresh_note is None:
                return
            await index_note(fresh_note, db=db)
        finally:
            db.close()

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_runner())
    except RuntimeError:
        asyncio.run(_runner())


async def semantic_search(query: str, *, limit: int = 10, db: Session | None = None) -> list[dict[str, Any]]:
    normalized = query.strip()
    if not normalized:
        return []

    embedding = (await _embed_texts([normalized], db=db))[0]
    collection = _get_collection()

    result = collection.query(
        query_embeddings=[embedding],
        n_results=max(1, min(limit, 20)),
        include=["documents", "metadatas", "distances"],
    )

    ids = result.get("ids", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    documents = result.get("documents", [[]])[0]
    distances = result.get("distances", [[]])[0]

    grouped: dict[int, dict[str, Any]] = {}
    for item_id, metadata, document, distance in zip(ids, metadatas, documents, distances):
        note_id = int(metadata["note_id"])
        score = 1 - float(distance)
        existing = grouped.get(note_id)
        if existing is None or score > existing["score"]:
            grouped[note_id] = {
                "note_id": note_id,
                "score": round(score, 4),
                "chunk": document,
                "title": metadata.get("title"),
                "media_type": metadata.get("media_type"),
                "match_id": item_id,
            }

    ordered = sorted(grouped.values(), key=lambda item: item["score"], reverse=True)
    return ordered[:limit]
