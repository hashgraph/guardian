"""Credit transaction endpoints — paginated, filterable."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_session
from api.db.models import Credit
from api.schemas import CreditResponse, PaginatedResponse

router = APIRouter(prefix="/api/v1/credits", tags=["credits"])


@router.get("", response_model=PaginatedResponse[CreditResponse])
async def list_credits(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    project_id: str | None = None,
    transaction_type: str | None = None,
    registry: str | None = None,
    vintage_min: int | None = None,
    vintage_max: int | None = None,
    sort: str | None = None,
):
    stmt = select(Credit)

    if project_id:
        stmt = stmt.where(Credit.project_id == project_id)
    if transaction_type:
        stmt = stmt.where(Credit.transaction_type == transaction_type)
    if registry:
        stmt = stmt.where(Credit.registry == registry)
    if vintage_min is not None:
        stmt = stmt.where(Credit.vintage >= vintage_min)
    if vintage_max is not None:
        stmt = stmt.where(Credit.vintage <= vintage_max)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    if sort:
        desc = sort.startswith("-")
        field_name = sort.lstrip("-+")
        col = getattr(Credit, field_name, None)
        if col is not None:
            stmt = stmt.order_by(col.desc() if desc else col.asc())
    else:
        stmt = stmt.order_by(Credit.id)

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = (await session.execute(stmt)).scalars().all()

    return PaginatedResponse(
        items=[CreditResponse.model_validate(r, from_attributes=True) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
