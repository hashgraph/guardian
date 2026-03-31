"""Chart / aggregation endpoints for market analytics."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_session
from api.db.models import Credit, Project
from api.schemas import (
    CategoryDataPoint,
    CountryDataPoint,
    CountryMapDataPoint,
    MarketStats,
    ReductionRemovalDataPoint,
    StatusBreakdown,
    TimeSeriesDataPoint,
    VintageDataPoint,
    VintageRemainingDataPoint,
)

router = APIRouter(prefix="/api/v1", tags=["charts"])


@router.get("/stats", response_model=MarketStats)
async def get_stats(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
    category: str | None = None,
):
    stmt = select(Project)
    if registry:
        stmt = stmt.where(Project.registry == registry)
    if category:
        stmt = stmt.where(Project.category == category)

    sub = stmt.subquery()

    agg = select(
        func.count(sub.c.project_id).label("total_projects"),
        func.coalesce(func.sum(sub.c.issued), 0).label("total_issued"),
        func.coalesce(func.sum(sub.c.retired), 0).label("total_retired"),
        func.count(func.distinct(sub.c.country)).label("num_countries"),
        func.count(func.distinct(sub.c.registry)).label("num_registries"),
    )
    row = (await session.execute(agg)).one()

    total_issued = int(row.total_issued)
    total_retired = int(row.total_retired)
    retirement_rate = (total_retired / total_issued * 100) if total_issued > 0 else 0.0

    # By registry
    reg_stmt = (
        select(sub.c.registry, func.count())
        .group_by(sub.c.registry)
        .order_by(func.count().desc())
    )
    by_registry = {r: c for r, c in (await session.execute(reg_stmt)).all() if r}

    # By category
    cat_stmt = (
        select(sub.c.category, func.count())
        .group_by(sub.c.category)
        .order_by(func.count().desc())
    )
    by_category = {c: n for c, n in (await session.execute(cat_stmt)).all() if c}

    # Most recent pipeline sync timestamp
    from api.db.models import Event
    sync_stmt = (
        select(func.max(Event.timestamp))
        .where(Event.event_type == "pipeline_sync")
    )
    last_sync_ts = (await session.execute(sync_stmt)).scalar_one_or_none()
    last_synced_at = last_sync_ts.date().isoformat() if last_sync_ts else None

    return MarketStats(
        total_projects=row.total_projects,
        total_issued=total_issued,
        total_retired=total_retired,
        retirement_rate=round(retirement_rate, 2),
        num_countries=row.num_countries,
        num_registries=row.num_registries,
        by_registry=by_registry,
        by_category=by_category,
        last_synced_at=last_synced_at,
    )


@router.get("/charts/issuances-by-vintage", response_model=list[VintageDataPoint])
async def issuances_by_vintage(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
):
    stmt = select(
        Credit.vintage,
        func.coalesce(
            func.sum(case((Credit.transaction_type == "issuance", Credit.quantity), else_=0)),
            0,
        ).label("issued"),
        func.coalesce(
            func.sum(case((Credit.transaction_type == "retirement", Credit.quantity), else_=0)),
            0,
        ).label("retired"),
    ).where(Credit.vintage.is_not(None))

    if registry:
        stmt = stmt.where(Credit.registry == registry)

    stmt = stmt.group_by(Credit.vintage).order_by(Credit.vintage)
    rows = (await session.execute(stmt)).all()

    return [VintageDataPoint(vintage=r.vintage, issued=int(r.issued), retired=int(r.retired)) for r in rows]


@router.get("/charts/credits-over-time", response_model=list[TimeSeriesDataPoint])
async def credits_over_time(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
):
    month_expr = func.to_char(Credit.transaction_date, "YYYY-MM")

    stmt = select(
        month_expr.label("month"),
        func.coalesce(
            func.sum(case((Credit.transaction_type == "issuance", Credit.quantity), else_=0)),
            0,
        ).label("issued"),
        func.coalesce(
            func.sum(case((Credit.transaction_type == "retirement", Credit.quantity), else_=0)),
            0,
        ).label("retired"),
    ).where(Credit.transaction_date.is_not(None))

    if registry:
        stmt = stmt.where(Credit.registry == registry)

    stmt = stmt.group_by(month_expr).order_by(month_expr)
    rows = (await session.execute(stmt)).all()

    return [TimeSeriesDataPoint(date=r.month, issued=int(r.issued), retired=int(r.retired)) for r in rows]


@router.get("/charts/projects-by-country", response_model=list[CountryDataPoint])
async def projects_by_country(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
    limit: int = Query(20, ge=1, le=100),
):
    stmt = select(Project.country, func.count().label("count")).where(
        Project.country.is_not(None)
    )
    if registry:
        stmt = stmt.where(Project.registry == registry)

    stmt = stmt.group_by(Project.country).order_by(func.count().desc()).limit(limit)
    rows = (await session.execute(stmt)).all()

    return [CountryDataPoint(country=r.country, count=r.count) for r in rows]


@router.get("/charts/projects-by-category", response_model=list[CategoryDataPoint])
async def projects_by_category(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
):
    stmt = select(Project.category, func.count().label("count")).where(
        Project.category.is_not(None)
    )
    if registry:
        stmt = stmt.where(Project.registry == registry)

    stmt = stmt.group_by(Project.category).order_by(func.count().desc())
    rows = (await session.execute(stmt)).all()

    return [CategoryDataPoint(category=r.category, count=r.count) for r in rows]


@router.get("/charts/status-breakdown", response_model=list[StatusBreakdown])
async def status_breakdown(
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(
            Project.registry,
            Project.status,
            func.count().label("count"),
        )
        .where(Project.status.is_not(None))
        .group_by(Project.registry, Project.status)
        .order_by(Project.registry, func.count().desc())
    )
    rows = (await session.execute(stmt)).all()

    return [StatusBreakdown(registry=r.registry, status=r.status, count=r.count) for r in rows]


# ── Country name → ISO 3166-1 alpha-3 ────────────────────────────────

_COUNTRY_ISO3: dict[str, str] = {
    "Albania": "ALB", "Angola": "AGO", "Argentina": "ARG", "Armenia": "ARM",
    "Aruba": "ABW", "Australia": "AUS", "Austria": "AUT", "Azerbaijan": "AZE",
    "Bahamas": "BHS", "Bahrain": "BHR", "Bangladesh": "BGD", "Belgium": "BEL",
    "Belize": "BLZ", "Benin": "BEN", "Bolivia": "BOL", "Botswana": "BWA",
    "Brazil": "BRA", "Bulgaria": "BGR", "Burkina Faso": "BFA", "Burundi": "BDI",
    "Cabo Verde": "CPV", "Cambodia": "KHM", "Cameroon": "CMR", "Canada": "CAN",
    "Central African Republic": "CAF", "Chad": "TCD", "Chile": "CHL",
    "China": "CHN", "Colombia": "COL", "Comoros": "COM",
    "Congo Republic": "COG", "Costa Rica": "CRI", "Cote d'Ivoire": "CIV",
    "Croatia": "HRV", "Cyprus": "CYP", "DR Congo": "COD", "Denmark": "DNK",
    "Djibouti": "DJI", "Dominican Republic": "DOM", "Ecuador": "ECU",
    "Egypt": "EGY", "El Salvador": "SLV", "Eritrea": "ERI", "Estonia": "EST",
    "Ethiopia": "ETH", "Fiji": "FJI", "France": "FRA", "Gabon": "GAB",
    "Gambia": "GMB", "Georgia": "GEO", "Germany": "DEU", "Ghana": "GHA",
    "Greece": "GRC", "Guam": "GUM", "Guatemala": "GTM", "Guinea": "GIN",
    "Guinea-Bissau": "GNB", "Haiti": "HTI", "Honduras": "HND",
    "Hong Kong": "HKG", "Iceland": "ISL", "India": "IND", "Indonesia": "IDN",
    "Iraq": "IRQ", "Ireland": "IRL", "Israel": "ISR", "Italy": "ITA",
    "Jamaica": "JAM", "Japan": "JPN", "Jordan": "JOR", "Kazakhstan": "KAZ",
    "Kenya": "KEN", "Kosovo": "XKX", "Laos": "LAO", "Latvia": "LVA",
    "Lesotho": "LSO", "Liberia": "LBR", "Lithuania": "LTU",
    "Madagascar": "MDG", "Malawi": "MWI", "Malaysia": "MYS", "Mali": "MLI",
    "Mauritania": "MRT", "Mauritius": "MUS", "Mayotte": "MYT", "Mexico": "MEX",
    "Mongolia": "MNG", "Morocco": "MAR", "Mozambique": "MOZ", "Myanmar": "MMR",
    "Namibia": "NAM", "Nepal": "NPL", "Netherlands": "NLD",
    "New Caledonia": "NCL", "New Zealand": "NZL", "Nicaragua": "NIC",
    "Niger": "NER", "Nigeria": "NGA", "North Macedonia": "MKD", "Oman": "OMN",
    "Pakistan": "PAK", "Panama": "PAN", "Papua New Guinea": "PNG",
    "Paraguay": "PRY", "Peru": "PER", "Philippines": "PHL", "Poland": "POL",
    "Portugal": "PRT", "Romania": "ROU", "Russia": "RUS", "Rwanda": "RWA",
    "Saudi Arabia": "SAU", "Senegal": "SEN", "Serbia": "SRB",
    "Sierra Leone": "SLE", "Singapore": "SGP", "Somalia": "SOM",
    "South Africa": "ZAF", "South Korea": "KOR", "Spain": "ESP",
    "Sri Lanka": "LKA", "Sudan": "SDN", "Suriname": "SUR", "Sweden": "SWE",
    "Switzerland": "CHE", "Syria": "SYR", "Taiwan": "TWN", "Tajikistan": "TJK",
    "Tanzania": "TZA", "Thailand": "THA", "Timor-Leste": "TLS", "Togo": "TGO",
    "Tunisia": "TUN", "T\u00fcrkiye": "TUR", "Uganda": "UGA", "Ukraine": "UKR",
    "United Arab Emirates": "ARE", "United Kingdom": "GBR",
    "United States": "USA", "Uruguay": "URY", "Uzbekistan": "UZB",
    "Vietnam": "VNM", "Yemen": "YEM", "Zambia": "ZMB", "Zimbabwe": "ZWE",
}


@router.get("/charts/credits-remaining-by-vintage", response_model=list[VintageRemainingDataPoint])
async def credits_remaining_by_vintage(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
):
    """Issued minus retired per vintage year — shows remaining (unsold) credits."""
    stmt = select(
        Credit.vintage,
        func.coalesce(
            func.sum(case((Credit.transaction_type == "issuance", Credit.quantity), else_=0)),
            0,
        ).label("issued"),
        func.coalesce(
            func.sum(case((Credit.transaction_type == "retirement", Credit.quantity), else_=0)),
            0,
        ).label("retired"),
    ).where(Credit.vintage.is_not(None))

    if registry:
        stmt = stmt.where(Credit.registry == registry)

    stmt = stmt.group_by(Credit.vintage).order_by(Credit.vintage)
    rows = (await session.execute(stmt)).all()

    return [
        VintageRemainingDataPoint(
            vintage=r.vintage,
            issued=int(r.issued),
            retired=int(r.retired),
            remaining=max(0, int(r.issued) - int(r.retired)),
        )
        for r in rows
    ]


@router.get("/charts/projects-by-country-map", response_model=list[CountryMapDataPoint])
async def projects_by_country_map(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
):
    """Country-level aggregation with ISO3 codes for world map choropleth."""
    stmt = select(
        Project.country,
        func.count().label("count"),
        func.coalesce(func.sum(Project.issued), 0).label("issued"),
        func.coalesce(func.sum(Project.retired), 0).label("retired"),
    ).where(Project.country.is_not(None))

    if registry:
        stmt = stmt.where(Project.registry == registry)

    stmt = stmt.group_by(Project.country).order_by(func.count().desc())
    rows = (await session.execute(stmt)).all()

    return [
        CountryMapDataPoint(
            country=r.country,
            iso3=_COUNTRY_ISO3.get(r.country, ""),
            count=r.count,
            issued=int(r.issued),
            retired=int(r.retired),
        )
        for r in rows
        if _COUNTRY_ISO3.get(r.country)
    ]


@router.get("/charts/reduction-removal-breakdown", response_model=list[ReductionRemovalDataPoint])
async def reduction_removal_breakdown(
    session: AsyncSession = Depends(get_session),
    registry: str | None = None,
):
    """Breakdown of projects by reduction/removal classification."""
    stmt = select(
        Project.reduction_removal,
        func.count().label("count"),
        func.coalesce(func.sum(Project.issued), 0).label("issued"),
        func.coalesce(func.sum(Project.retired), 0).label("retired"),
    ).where(Project.reduction_removal.is_not(None))

    if registry:
        stmt = stmt.where(Project.registry == registry)

    stmt = stmt.group_by(Project.reduction_removal).order_by(func.count().desc())
    rows = (await session.execute(stmt)).all()

    return [
        ReductionRemovalDataPoint(
            reduction_removal=r.reduction_removal,
            count=r.count,
            issued=int(r.issued),
            retired=int(r.retired),
        )
        for r in rows
    ]
