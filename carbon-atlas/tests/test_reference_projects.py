"""
Regression tests for reference projects across different lifecycle stages.

Each test inserts a realistic project matching known registry data,
then verifies the API returns correct values. This catches regressions in:
- Model serialization (especially JSON array fields like sdg_goals)
- Status mapping
- Credit aggregation
- SDG and certification parsing
"""

from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models import Credit, Project, ProjectDeveloper, ProjectDeveloperLink


# ---------------------------------------------------------------------------
# Reference project data — sourced from registry exports
# ---------------------------------------------------------------------------

VCS674 = dict(
    project_id="VCS674",
    name="Rimba Raya Biodiversity Reserve Project",
    registry="verra",
    proponent="InfiniteEARTH",
    protocol=["vm0004"],
    category="forest",
    status="crediting",
    country="Indonesia",
    is_compliance=False,
    issued=33_625_616,
    retired=26_640_883,
    first_issuance_at=date(2013, 12, 20),
    first_retirement_at=date(2014, 1, 20),
    project_url="https://registry.verra.org/app/projectDetail/VCS/674",
    project_type="REDD+",
    project_type_source="berkeley",
    sdg_goals=[
        "01: No Poverty", "02: Zero Hunger", "03: Good Health and Well-being",
        "04: Quality Education", "05: Gender Equality", "06: Clean Water and Sanitation",
        "07: Affordable and Clean Energy", "08: Decent Work and Economic Growth",
        "09: Industry, Innovation and Infrastructure", "10: Reduced Inequalities",
        "11: Sustainable Cities and Communities", "12: Responsible Consumption and Production",
        "13: Climate Action", "14: Life Below Water", "15: Life on Land",
        "16: Peace, Justice, and Strong Institutions", "17: Partnerships for the Goals",
    ],
    additional_certifications=["CCB-Biodiversity Gold", "CCB-Climate Gold", "CCB-Community Gold", "CCB-Gold"],
    crediting_period_start=date(2009, 7, 1),
    crediting_period_end=date(2039, 6, 30),
    estimated_annual_reductions=3_527_171,
)

VCS934 = dict(
    project_id="VCS934",
    name="The Mai Ndombe REDD+ Project",
    registry="verra",
    proponent="Wildlife Works Carbon LLC",
    protocol=["vm0009"],
    category="forest",
    status="registered",
    country="DR Congo",
    is_compliance=False,
    issued=42_534_256,
    retired=23_020_763,
    first_issuance_at=date(2013, 2, 4),
    first_retirement_at=date(2013, 2, 4),
    project_url="https://registry.verra.org/app/projectDetail/VCS/934",
    project_type="REDD+",
    project_type_source="berkeley",
    additional_certifications=["CCB-Biodiversity Gold", "CCB-Climate Gold", "CCB-Gold"],
    crediting_period_start=date(2011, 3, 14),
    crediting_period_end=date(2041, 3, 13),
    estimated_annual_reductions=5_671_613,
)

VCS902_WITHDRAWN = dict(
    project_id="VCS902",
    name="KARIBA REDD+ PROJECT",
    registry="verra",
    proponent="Carbon Green Investments (Guernsey)",
    protocol=["vm0009"],
    category="forest",
    status="withdrawn",
    country="Zimbabwe",
    is_compliance=False,
    issued=29_016_364,
    retired=25_706_769,
    first_issuance_at=date(2013, 12, 23),
    first_retirement_at=date(2013, 12, 23),
    project_url="https://registry.verra.org/app/projectDetail/VCS/902",
    project_type="REDD+",
    project_type_source="berkeley",
    additional_certifications=["CCB-Biodiversity Gold", "CCB-Climate Gold", "CCB-Gold"],
)

GS11440_COOKSTOVE = dict(
    project_id="GS11440",
    name="GS10884 - KOKO Kenya - Ethanol Cookstoves Program - CPA-0002",
    registry="gold-standard",
    proponent="KOKO Network limited",
    protocol=["unknown"],
    category="fuel-switching",
    status="crediting",
    country="Kenya",
    is_compliance=False,
    issued=14_941_932,
    retired=180_954,
    first_issuance_at=date(2023, 2, 6),
    first_retirement_at=date(2023, 6, 21),
    project_url="https://registry.goldstandard.org/projects?q=gs11440",
    project_type="Cookstove",
    project_type_source="berkeley",
    sdg_goals=[
        "03: Good Health and Well-being", "05: Gender Equality",
        "07: Affordable and Clean Energy", "13: Climate Action",
    ],
    description="KOKO Kenya ethanol cookstove programme",
    estimated_annual_reductions=5_000_000,
)

GS447_UGANDA = dict(
    project_id="GS447",
    name="Improved Cookstoves for Social Impact in Ugandan Communities",
    registry="gold-standard",
    proponent="Impact Carbon",
    protocol=["unknown"],
    category="fuel-switching",
    status="crediting",
    country="Uganda",
    is_compliance=False,
    issued=11_404_198,
    retired=8_539_332,
    first_issuance_at=date(2010, 3, 24),
    first_retirement_at=date(2010, 7, 26),
    project_url="https://registry.goldstandard.org/projects?q=gs447",
    project_type="Cookstove",
    project_type_source="berkeley",
    sdg_goals=[
        "01: No Poverty", "03: Good Health and Well-being", "05: Gender Equality",
        "07: Affordable and Clean Energy", "08: Decent Work and Economic Growth",
        "12: Responsible Consumption and Production", "13: Climate Action",
        "15: Life on Land",
    ],
)

GS23521_LISTED = dict(
    project_id="GS23521",
    name="Reducing Methane Emissions through Improved Rice Cultivation",
    registry="gold-standard",
    status="listed",
    country="India",
    category="agriculture",
    issued=0,
    retired=0,
    sdg_goals=["02: Zero Hunger", "08: Decent Work and Economic Growth"],
)

REFERENCE_PROJECTS = [VCS674, VCS934, VCS902_WITHDRAWN, GS11440_COOKSTOVE, GS447_UGANDA, GS23521_LISTED]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _insert_project(db: AsyncSession, data: dict) -> Project:
    p = Project(**data)
    db.add(p)
    await db.commit()
    return p


async def _insert_credits(db: AsyncSession, project_id: str, issuances: int, retirements: int) -> list[Credit]:
    credits = []
    if issuances:
        credits.append(Credit(
            project_id=project_id, quantity=issuances, vintage=2023,
            transaction_date=date(2024, 1, 1), transaction_type="issuance",
            registry="verra",
        ))
    if retirements:
        credits.append(Credit(
            project_id=project_id, quantity=retirements, vintage=2023,
            transaction_date=date(2024, 6, 1), transaction_type="retirement",
            registry="verra", retirement_beneficiary="Test Corp",
        ))
    for c in credits:
        db.add(c)
    await db.commit()
    return credits


# ---------------------------------------------------------------------------
# Tests: Project detail correctness
# ---------------------------------------------------------------------------

class TestReferenceProjectDetails:
    """Verify each reference project returns correct data via the API."""

    @pytest.mark.parametrize("project_data", REFERENCE_PROJECTS, ids=[
        "VCS674-crediting-forest", "VCS934-registered-redd",
        "VCS902-withdrawn", "GS11440-cookstove-poa",
        "GS447-uganda-cookstove", "GS23521-listed-agriculture",
    ])
    async def test_project_detail_fields(self, db: AsyncSession, client: AsyncClient, project_data: dict):
        await _insert_project(db, project_data)
        pid = project_data["project_id"]

        resp = await client.get(f"/api/v1/projects/{pid}")
        assert resp.status_code == 200
        body = resp.json()

        assert body["project_id"] == pid
        assert body["name"] == project_data["name"]
        assert body["registry"] == project_data["registry"]
        assert body["status"] == project_data["status"]
        assert body["issued"] == project_data.get("issued", 0) or 0
        assert body["retired"] == project_data.get("retired", 0) or 0

        if "country" in project_data and project_data["country"]:
            assert body["country"] == project_data["country"]

    async def test_vcs674_sdg_goals_complete(self, db: AsyncSession, client: AsyncClient):
        """VCS674 has all 17 SDG goals — verify none are dropped."""
        await _insert_project(db, VCS674)
        resp = await client.get("/api/v1/projects/VCS674")
        body = resp.json()
        assert len(body["sdg_goals"]) == 17
        assert body["sdg_goals"][0] == "01: No Poverty"
        assert body["sdg_goals"][-1] == "17: Partnerships for the Goals"

    async def test_vcs674_certifications_no_sdg_leak(self, db: AsyncSession, client: AsyncClient):
        """VCS674 certifications should be CCB labels only, not SDG entries."""
        await _insert_project(db, VCS674)
        resp = await client.get("/api/v1/projects/VCS674")
        certs = resp.json()["additional_certifications"]
        assert len(certs) == 4
        for cert in certs:
            assert cert.startswith("CCB-"), f"Non-CCB cert found: {cert}"

    async def test_gld11440_sdg_labels_not_raw_numbers(self, db: AsyncSession, client: AsyncClient):
        """GS SDGs should be full labels, not raw comma-separated numbers."""
        await _insert_project(db, GS11440_COOKSTOVE)
        resp = await client.get("/api/v1/projects/GS11440")
        sdgs = resp.json()["sdg_goals"]
        assert len(sdgs) == 4
        # Should be labels, not raw numbers
        for sdg in sdgs:
            assert ":" in sdg, f"SDG should be a label, got raw: {sdg}"
        assert "13: Climate Action" in sdgs

    async def test_gld447_sdg_count(self, db: AsyncSession, client: AsyncClient):
        """GS447 Uganda cookstoves should have 8 SDG goals."""
        await _insert_project(db, GS447_UGANDA)
        resp = await client.get("/api/v1/projects/GS447")
        assert len(resp.json()["sdg_goals"]) == 8


class TestReferenceProjectCredits:
    """Verify credit data for reference projects."""

    async def test_vcs674_credits_pagination(self, db: AsyncSession, client: AsyncClient):
        await _insert_project(db, VCS674)
        await _insert_credits(db, "VCS674", 33_625_616, 26_640_883)

        resp = await client.get("/api/v1/credits?project_id=VCS674&page_size=10")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert len(body["items"]) == 2

    async def test_withdrawn_project_still_has_credits(self, db: AsyncSession, client: AsyncClient):
        """VCS902 is withdrawn but still has issued/retired credits."""
        await _insert_project(db, VCS902_WITHDRAWN)
        await _insert_credits(db, "VCS902", 29_016_364, 25_706_769)

        resp = await client.get("/api/v1/credits?project_id=VCS902")
        assert resp.status_code == 200
        assert resp.json()["total"] == 2

    async def test_listed_project_zero_credits(self, db: AsyncSession, client: AsyncClient):
        """GS23521 is listed with zero credits."""
        await _insert_project(db, GS23521_LISTED)
        resp = await client.get("/api/v1/credits?project_id=GS23521")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


class TestReferenceProjectFilters:
    """Verify filtering works correctly for different project stages."""

    async def _insert_all(self, db: AsyncSession):
        for data in REFERENCE_PROJECTS:
            db.add(Project(**data))
        await db.commit()

    async def test_filter_by_status_crediting(self, db: AsyncSession, client: AsyncClient):
        await self._insert_all(db)
        resp = await client.get("/api/v1/projects?status=crediting")
        body = resp.json()
        assert body["total"] == 3  # VCS674, GS11440, GS447
        for item in body["items"]:
            assert item["status"] == "crediting"

    async def test_filter_by_status_withdrawn(self, db: AsyncSession, client: AsyncClient):
        await self._insert_all(db)
        resp = await client.get("/api/v1/projects?status=withdrawn")
        body = resp.json()
        assert body["total"] == 1
        assert body["items"][0]["project_id"] == "VCS902"

    async def test_filter_by_status_listed(self, db: AsyncSession, client: AsyncClient):
        await self._insert_all(db)
        resp = await client.get("/api/v1/projects?status=listed")
        assert resp.json()["total"] == 1

    async def test_filter_by_registry_gold_standard(self, db: AsyncSession, client: AsyncClient):
        await self._insert_all(db)
        resp = await client.get("/api/v1/projects?registry=gold-standard")
        body = resp.json()
        assert body["total"] == 3  # GS11440, GS447, GS23521
        for item in body["items"]:
            assert item["registry"] == "gold-standard"

    async def test_filter_by_category_forest(self, db: AsyncSession, client: AsyncClient):
        await self._insert_all(db)
        resp = await client.get("/api/v1/projects?category=forest")
        body = resp.json()
        assert body["total"] == 3  # VCS674, VCS934, VCS902

    async def test_search_cookstove(self, db: AsyncSession, client: AsyncClient):
        await self._insert_all(db)
        resp = await client.get("/api/v1/projects?search=cookstove")
        body = resp.json()
        assert body["total"] >= 2  # GS11440 and GS447
        for item in body["items"]:
            assert "cookstove" in item["name"].lower()

    async def test_sort_by_issued_desc(self, db: AsyncSession, client: AsyncClient):
        await self._insert_all(db)
        resp = await client.get("/api/v1/projects?sort=-issued")
        items = resp.json()["items"]
        issued_vals = [i["issued"] or 0 for i in items]
        assert issued_vals == sorted(issued_vals, reverse=True)


class TestStatsWithReferenceData:
    """Verify dashboard stats aggregate correctly across reference projects."""

    async def test_stats_totals(self, db: AsyncSession, client: AsyncClient):
        for data in REFERENCE_PROJECTS:
            db.add(Project(**data))
        await db.commit()

        resp = await client.get("/api/v1/stats")
        assert resp.status_code == 200
        stats = resp.json()
        assert stats["total_projects"] == 6
        assert stats["num_registries"] == 2
        # Total issued = sum of all reference projects' issued
        expected_issued = sum(p.get("issued", 0) or 0 for p in REFERENCE_PROJECTS)
        assert stats["total_issued"] == expected_issued
