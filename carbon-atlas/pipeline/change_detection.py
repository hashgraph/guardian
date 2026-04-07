"""
Hash-based change detection for carbon market data.

Compares incoming data against existing database state.
Generates structured Event records for:
- new_project: project_id not in DB
- status_change: project status differs
- metadata_update: other project fields changed
- new_issuance: credit transaction not in DB (issuance)
- new_retirement: credit transaction not in DB (retirement)
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models import Credit, Event, Project


def _hash_row(row: dict, keys: list[str]) -> str:
    """Generate a stable hash from selected fields."""
    parts = []
    for k in sorted(keys):
        v = row.get(k)
        if pd.isna(v) if isinstance(v, float) else v is None:
            parts.append("")
        else:
            parts.append(str(v))
    return hashlib.md5("|".join(parts).encode()).hexdigest()


# Fields used for project change detection
PROJECT_HASH_KEYS = [
    "name", "registry", "proponent", "status", "country", "category",
    "issued", "retired", "project_url",
]


async def detect_project_changes(
    session: AsyncSession,
    incoming_df: pd.DataFrame,
) -> list[Event]:
    """
    Compare incoming projects against DB state and generate events.
    Returns a list of Event objects (not yet committed).
    """
    events: list[Event] = []
    now = datetime.utcnow()

    # Load existing projects (only the fields we need for comparison)
    result = await session.execute(
        select(
            Project.project_id,
            Project.name,
            Project.registry,
            Project.proponent,
            Project.status,
            Project.country,
            Project.category,
            Project.issued,
            Project.retired,
            Project.project_url,
        )
    )
    existing = {row.project_id: dict(row._mapping) for row in result.all()}

    for _, row in incoming_df.iterrows():
        pid = row.get("project_id")
        if not pid:
            continue

        registry = row.get("registry")
        incoming_dict = {k: row.get(k) for k in PROJECT_HASH_KEYS}

        if pid not in existing:
            # New project
            events.append(Event(
                event_type="new_project",
                project_id=pid,
                registry=registry,
                timestamp=now,
                new_value=_serialize_for_json(incoming_dict),
            ))
        else:
            old = existing[pid]
            # Check status change specifically
            old_status = old.get("status")
            new_status = row.get("status")
            if old_status and new_status and old_status != new_status:
                events.append(Event(
                    event_type="status_change",
                    project_id=pid,
                    registry=registry,
                    timestamp=now,
                    old_value={"status": old_status},
                    new_value={"status": new_status},
                ))

            # Check for other metadata changes
            old_hash = _hash_row(old, PROJECT_HASH_KEYS)
            new_hash = _hash_row(incoming_dict, PROJECT_HASH_KEYS)
            if old_hash != new_hash and old_status == new_status:
                changes = {
                    k: {"old": old.get(k), "new": incoming_dict.get(k)}
                    for k in PROJECT_HASH_KEYS
                    if str(old.get(k, "")) != str(incoming_dict.get(k, ""))
                    and k != "status"
                }
                if changes:
                    events.append(Event(
                        event_type="metadata_update",
                        project_id=pid,
                        registry=registry,
                        timestamp=now,
                        old_value=_serialize_for_json({k: v["old"] for k, v in changes.items()}),
                        new_value=_serialize_for_json({k: v["new"] for k, v in changes.items()}),
                    ))

    return events


# Fields that uniquely identify a credit transaction
CREDIT_KEY_FIELDS = ["project_id", "quantity", "vintage", "transaction_date", "transaction_type"]


async def detect_credit_changes(
    session: AsyncSession,
    incoming_df: pd.DataFrame,
) -> list[Event]:
    """
    Detect new credit transactions by comparing against existing DB state.
    """
    events: list[Event] = []
    now = datetime.utcnow()

    # Get existing credit hashes
    result = await session.execute(text(
        "SELECT project_id, quantity, vintage, transaction_date, transaction_type FROM credits"
    ))
    existing_hashes = set()
    for row in result.all():
        existing_hashes.add(_hash_row(dict(row._mapping), CREDIT_KEY_FIELDS))

    for _, row in incoming_df.iterrows():
        row_dict = {k: row.get(k) for k in CREDIT_KEY_FIELDS}
        h = _hash_row(row_dict, CREDIT_KEY_FIELDS)

        if h not in existing_hashes:
            tx_type = row.get("transaction_type", "")
            event_type = "new_retirement" if tx_type == "retirement" else "new_issuance"
            events.append(Event(
                event_type=event_type,
                project_id=str(row.get("project_id", "")),
                registry=row.get("registry"),
                timestamp=now,
                new_value=_serialize_for_json({
                    "quantity": row.get("quantity"),
                    "vintage": row.get("vintage"),
                    "transaction_date": str(row.get("transaction_date", "")),
                    "transaction_type": tx_type,
                }),
            ))

    return events


def _serialize_for_json(d: dict) -> dict:
    """Convert values to JSON-serializable types."""
    result = {}
    for k, v in d.items():
        if pd.isna(v) if isinstance(v, float) else v is None:
            result[k] = None
        elif hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result
