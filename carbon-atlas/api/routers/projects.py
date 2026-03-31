"""Project endpoints — paginated, filterable, searchable."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_session
from api.db.models import Project, ProjectDeveloper, ProjectDeveloperLink
from api.schemas import (
    DeveloperBrief,
    PaginatedResponse,
    ProjectListItem,
    ProjectResponse,
)

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("", response_model=PaginatedResponse[ProjectListItem])
async def list_projects(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    registry: str | None = None,
    status: str | None = None,
    category: str | None = None,
    country: str | None = None,
    is_compliance: bool | None = None,
    reduction_removal: str | None = None,
    corsia_eligible: bool | None = None,
    search: str | None = None,
    sort: str | None = None,
):
    stmt = select(Project)

    if registry:
        stmt = stmt.where(Project.registry == registry)
    if status:
        stmt = stmt.where(Project.status == status)
    if category:
        stmt = stmt.where(Project.category == category)
    if country:
        stmt = stmt.where(Project.country == country)
    if is_compliance is not None:
        stmt = stmt.where(Project.is_compliance == is_compliance)
    if reduction_removal:
        stmt = stmt.where(Project.reduction_removal == reduction_removal)
    if corsia_eligible is not None:
        stmt = stmt.where(Project.corsia_eligible == corsia_eligible)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Project.name.ilike(pattern) | Project.project_id.ilike(pattern)
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    # Sort
    if sort:
        desc = sort.startswith("-")
        field_name = sort.lstrip("-+")
        col = getattr(Project, field_name, None)
        if col is not None:
            stmt = stmt.order_by(col.desc() if desc else col.asc())
    else:
        stmt = stmt.order_by(Project.project_id)

    # Paginate
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = (await session.execute(stmt)).scalars().all()

    return PaginatedResponse(
        items=[ProjectListItem.model_validate(r, from_attributes=True) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Project).where(Project.project_id == project_id)
    project = (await session.execute(stmt)).scalar_one_or_none()
    if project is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch linked developers
    dev_stmt = (
        select(ProjectDeveloper.id, ProjectDeveloper.name)
        .join(ProjectDeveloperLink)
        .where(ProjectDeveloperLink.project_id == project_id)
    )
    devs = (await session.execute(dev_stmt)).all()

    # Build response manually to avoid lazy-loading the developers relationship
    data = {
        c.key: getattr(project, c.key)
        for c in Project.__table__.columns
    }
    data["developers"] = [DeveloperBrief(id=d.id, name=d.name) for d in devs]
    return ProjectResponse(**data)
