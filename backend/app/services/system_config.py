"""
Database-backed system configuration helpers.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models import SystemConfig


def _normalize(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _mask_secret(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}****{value[-4:]}"


def get_value(db: Session, key: str) -> Optional[str]:
    row = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    return _normalize(row.value) if row else None


def get_row(db: Session, key: str) -> SystemConfig | None:
    return db.query(SystemConfig).filter(SystemConfig.key == key).first()


def set_value(db: Session, key: str, value: str | None, *, is_secret: bool = False) -> None:
    normalized = _normalize(value)

    row = get_row(db, key)
    if normalized is None:
        if row is not None:
            db.delete(row)
        return

    if row is None:
        row = SystemConfig(key=key, value=normalized, is_secret=is_secret)
        db.add(row)
    else:
        row.value = normalized
        row.is_secret = is_secret


def get_llm_settings(db: Session) -> dict[str, Optional[str]]:
    return {
        "llm_api_key": get_value(db, "llm_api_key"),
        "llm_api_base": get_value(db, "llm_api_base"),
        "llm_model": get_value(db, "llm_model"),
    }


def get_llm_settings_response(db: Session) -> dict[str, object]:
    api_key = get_value(db, "llm_api_key")
    api_base = get_value(db, "llm_api_base")
    model = get_value(db, "llm_model")
    return {
        "llm_api_base": api_base,
        "llm_model": model,
        "llm_api_key_set": bool(api_key),
        "llm_api_key_masked": _mask_secret(api_key),
    }

