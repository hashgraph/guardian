"""Pydantic response models for the market data API."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class DeveloperBrief(BaseModel):
    id: str
    name: str


class ProjectResponse(BaseModel):
    project_id: str
    name: str | None = None
    registry: str
    proponent: str | None = None
    protocol: list[str] | None = None
    category: str | None = None
    status: str | None = None
    country: str | None = None
    listed_at: date | None = None
    is_compliance: bool | None = None
    retired: int | None = 0
    issued: int | None = 0
    first_issuance_at: date | None = None
    first_retirement_at: date | None = None
    project_url: str | None = None
    project_type: str | None = None
    project_type_source: str | None = None
    # Extended fields
    sdg_goals: list | None = None
    crediting_period_start: date | None = None
    crediting_period_end: date | None = None
    description: str | None = None
    additional_certifications: list | None = None
    afolu_activities: str | None = None
    region: str | None = None
    registration_date: date | None = None
    estimated_annual_reductions: int | None = None
    reduction_removal: str | None = None
    corsia_eligible: bool | None = None
    # Linked developers
    developers: list[DeveloperBrief] | None = None


class ProjectListItem(BaseModel):
    project_id: str
    name: str | None = None
    registry: str
    status: str | None = None
    country: str | None = None
    category: str | None = None
    proponent: str | None = None
    issued: int | None = 0
    retired: int | None = 0
    listed_at: date | None = None
    reduction_removal: str | None = None
    corsia_eligible: bool | None = None


# ---------------------------------------------------------------------------
# Credits
# ---------------------------------------------------------------------------

class CreditResponse(BaseModel):
    id: int
    project_id: str
    quantity: int | None = None
    vintage: int | None = None
    transaction_date: date | None = None
    transaction_type: str | None = None
    retirement_beneficiary: str | None = None
    retirement_reason: str | None = None
    registry: str | None = None
    is_planned: bool | None = False


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class EventResponse(BaseModel):
    id: int
    event_type: str
    project_id: str
    registry: str | None = None
    timestamp: datetime
    old_value: dict | None = None
    new_value: dict | None = None


# ---------------------------------------------------------------------------
# Developers
# ---------------------------------------------------------------------------

class DeveloperResponse(BaseModel):
    id: str
    name: str
    project_count: int = 0
    total_issued: int | None = 0
    total_retired: int | None = 0
    countries: list | None = None
    registries: list | None = None
    categories: list | None = None
    methodologies: list | None = None


# ---------------------------------------------------------------------------
# Stats / Charts
# ---------------------------------------------------------------------------

class MarketStats(BaseModel):
    total_projects: int
    total_issued: int
    total_retired: int
    retirement_rate: float
    num_countries: int
    num_registries: int
    by_registry: dict[str, int]
    by_category: dict[str, int]


class VintageDataPoint(BaseModel):
    vintage: int
    issued: int
    retired: int


class TimeSeriesDataPoint(BaseModel):
    date: str  # YYYY-MM
    issued: int
    retired: int


class CountryDataPoint(BaseModel):
    country: str
    count: int


class CategoryDataPoint(BaseModel):
    category: str
    count: int


class StatusBreakdown(BaseModel):
    registry: str
    status: str
    count: int


class VintageRemainingDataPoint(BaseModel):
    vintage: int
    issued: int
    retired: int
    remaining: int


class CountryMapDataPoint(BaseModel):
    country: str
    iso3: str
    count: int
    issued: int
    retired: int


class ReductionRemovalDataPoint(BaseModel):
    reduction_removal: str
    count: int
    issued: int
    retired: int
