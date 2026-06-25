"""Change event feed endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_session
from api.db.models import Event
from api.schemas import EventResponse, PaginatedResponse

router = APIRouter(prefix="/api/v1/events", tags=["events"])


@router.get("", response_model=PaginatedResponse[EventResponse])
async def list_events(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    event_type: str | None = None,
    project_id: str | None = None,
    registry: str | None = None,
):
    stmt = select(Event)

    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    if project_id:
        stmt = stmt.where(Event.project_id == project_id)
    if registry:
        stmt = stmt.where(Event.registry == registry)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Event.timestamp.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = (await session.execute(stmt)).scalars().all()

    return PaginatedResponse(
        items=[EventResponse.model_validate(r, from_attributes=True) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
