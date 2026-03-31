"""Developer entity endpoints — paginated, filterable, searchable."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_session
from api.db.models import Project, ProjectDeveloper, ProjectDeveloperLink
from api.schemas import (
    DeveloperResponse,
    PaginatedResponse,
    ProjectListItem,
)

router = APIRouter(prefix="/api/v1/developers", tags=["developers"])


@router.get("", response_model=PaginatedResponse[DeveloperResponse])
async def list_developers(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: str | None = None,
    sort: str | None = None,
):
    stmt = select(ProjectDeveloper)

    if search:
        stmt = stmt.where(ProjectDeveloper.name.ilike(f"%{search}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    if sort:
        desc = sort.startswith("-")
        field_name = sort.lstrip("-+")
        col = getattr(ProjectDeveloper, field_name, None)
        if col is not None:
            stmt = stmt.order_by(col.desc() if desc else col.asc())
    else:
        stmt = stmt.order_by(ProjectDeveloper.project_count.desc())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = (await session.execute(stmt)).scalars().all()

    return PaginatedResponse(
        items=[DeveloperResponse.model_validate(r, from_attributes=True) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{developer_id}", response_model=DeveloperResponse)
async def get_developer(
    developer_id: str,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(ProjectDeveloper).where(ProjectDeveloper.id == developer_id)
    dev = (await session.execute(stmt)).scalar_one_or_none()
    if dev is None:
        raise HTTPException(status_code=404, detail="Developer not found")
    return DeveloperResponse.model_validate(dev, from_attributes=True)


@router.get("/{developer_id}/projects", response_model=PaginatedResponse[ProjectListItem])
async def get_developer_projects(
    developer_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
):
    stmt = (
        select(Project)
        .join(ProjectDeveloperLink)
        .where(ProjectDeveloperLink.developer_id == developer_id)
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Project.project_id)
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = (await session.execute(stmt)).scalars().all()

    return PaginatedResponse(
        items=[ProjectListItem.model_validate(r, from_attributes=True) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
