"""
Business logic tests — validates carbon market domain correctness.

These test the kinds of things a carbon market analyst or QA would verify:
- Correct credit quantity aggregation
- Retirement rate calculation accuracy
- Registry-specific data handling
- Vintage year correctness
- Status values matching registry conventions
"""

import pytest
from datetime import date

from api.db.models import Credit, Project


@pytest.mark.asyncio
async def test_retirement_rate_calculation(client, db):
    """Retirement rate = retired/issued * 100. Critical market metric."""
    db.add(Project(
        project_id="RATE-TEST",
        name="Rate Test",
        registry="verra",
        issued=200_000,
        retired=160_000,
    ))
    await db.commit()

    resp = await client.get("/api/v1/stats")
    data = resp.json()
    assert data["retirement_rate"] == 80.0


@pytest.mark.asyncio
async def test_zero_issued_no_division_error(client, db):
    """Projects with zero issuance should not cause division by zero in retirement rate."""
    db.add(Project(
        project_id="ZERO-TEST",
        name="Zero Issuance Project",
        registry="verra",
        issued=0,
        retired=0,
    ))
    await db.commit()

    resp = await client.get("/api/v1/stats")
    data = resp.json()
    assert data["retirement_rate"] == 0.0


@pytest.mark.asyncio
async def test_vintage_aggregation_accuracy(client, db):
    """Vintage charts must correctly sum issuances and retirements by year."""
    db.add(Project(project_id="VINT-1", name="Vintage Test", registry="verra"))
    await db.commit()

    credits = [
        Credit(project_id="VINT-1", quantity=10000, vintage=2022,
               transaction_date=date(2023, 1, 1), transaction_type="issuance", registry="verra"),
        Credit(project_id="VINT-1", quantity=15000, vintage=2022,
               transaction_date=date(2023, 3, 1), transaction_type="issuance", registry="verra"),
        Credit(project_id="VINT-1", quantity=5000, vintage=2022,
               transaction_date=date(2023, 6, 1), transaction_type="retirement", registry="verra"),
        Credit(project_id="VINT-1", quantity=3000, vintage=2022,
               transaction_date=date(2023, 9, 1), transaction_type="retirement", registry="verra"),
        Credit(project_id="VINT-1", quantity=20000, vintage=2023,
               transaction_date=date(2024, 1, 1), transaction_type="issuance", registry="verra"),
    ]
    for c in credits:
        db.add(c)
    await db.commit()

    resp = await client.get("/api/v1/charts/issuances-by-vintage")
    data = resp.json()

    v2022 = next(d for d in data if d["vintage"] == 2022)
    assert v2022["issued"] == 25000
    assert v2022["retired"] == 8000

    v2023 = next(d for d in data if d["vintage"] == 2023)
    assert v2023["issued"] == 20000
    assert v2023["retired"] == 0


@pytest.mark.asyncio
async def test_gold_standard_planned_credits(client, db):
    """Gold Standard PERs (Planned Emission Reductions) must be flagged separately."""
    db.add(Project(project_id="GS-PER", name="GS Planned Test", registry="gold-standard"))
    await db.commit()

    db.add(Credit(
        project_id="GS-PER",
        quantity=50000,
        vintage=2025,
        transaction_type="issuance",
        registry="gold-standard",
        is_planned=True,
    ))
    await db.commit()

    resp = await client.get("/api/v1/credits?project_id=GS-PER")
    item = resp.json()["items"][0]
    assert item["is_planned"] is True


@pytest.mark.asyncio
async def test_multi_registry_stats(client, db):
    """Stats must aggregate correctly across multiple registries."""
    db.add(Project(project_id="VCS-MULTI", name="Verra Project", registry="verra",
                   issued=100_000, retired=50_000, country="India", category="renewable-energy"))
    db.add(Project(project_id="GS-MULTI", name="GS Project", registry="gold-standard",
                   issued=80_000, retired=30_000, country="Kenya", category="energy-efficiency"))
    await db.commit()

    resp = await client.get("/api/v1/stats")
    data = resp.json()
    assert data["total_projects"] == 2
    assert data["total_issued"] == 180_000
    assert data["total_retired"] == 80_000
    assert data["num_countries"] == 2
    assert data["num_registries"] == 2
    assert data["by_registry"]["verra"] == 1
    assert data["by_registry"]["gold-standard"] == 1
    assert data["by_category"]["renewable-energy"] == 1
    assert data["by_category"]["energy-efficiency"] == 1


@pytest.mark.asyncio
async def test_sdg_goals_in_project_detail(client, db):
    """SDG goals are critical for buyers filtering by impact — must be in detail response."""
    db.add(Project(
        project_id="SDG-TEST",
        name="SDG Project",
        registry="verra",
        sdg_goals=[1, 7, 13, 15],
    ))
    await db.commit()

    resp = await client.get("/api/v1/projects/SDG-TEST")
    data = resp.json()
    assert data["sdg_goals"] == [1, 7, 13, 15]


@pytest.mark.asyncio
async def test_crediting_period_in_project_detail(client, db):
    """Crediting period defines when a project can generate credits — essential for vintage eligibility."""
    db.add(Project(
        project_id="CRED-PERIOD",
        name="Crediting Period Test",
        registry="verra",
        crediting_period_start=date(2018, 1, 1),
        crediting_period_end=date(2028, 12, 31),
    ))
    await db.commit()

    resp = await client.get("/api/v1/projects/CRED-PERIOD")
    data = resp.json()
    assert data["crediting_period_start"] == "2018-01-01"
    assert data["crediting_period_end"] == "2028-12-31"
