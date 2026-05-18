"""Tests for database models — verifies schema correctness and relationships."""

import pytest
from datetime import date, datetime
from sqlalchemy import select

from api.db.models import Credit, Event, Project, ProjectDeveloper, ProjectDeveloperLink


@pytest.mark.asyncio
async def test_project_creation(db):
    """A project with all harmonized + extended fields can be persisted."""
    p = Project(
        project_id="VCS-9999",
        name="REDD+ Amazon",
        registry="verra",
        proponent="Amazon Corp",
        protocol=["VM0009"],
        category="forest-and-land-use",
        status="registered",
        country="Brazil",
        listed_at=date(2020, 1, 1),
        is_compliance=False,
        issued=1_000_000,
        retired=500_000,
        first_issuance_at=date(2021, 6, 1),
        first_retirement_at=date(2022, 1, 1),
        project_url="https://registry.verra.org/app/projectDetail/VCS/9999",
        project_type="redd+",
        project_type_source="berkeley",
        # Extended
        sdg_goals=[13, 15],
        crediting_period_start=date(2020, 1, 1),
        crediting_period_end=date(2030, 12, 31),
        description="Avoided deforestation in the Amazon basin",
        additional_certifications=["CCB"],
        afolu_activities="REDD",
        region="Amazonas",
        registration_date=date(2020, 3, 15),
        estimated_annual_reductions=100_000,
    )
    db.add(p)
    await db.commit()

    result = (await db.execute(select(Project).where(Project.project_id == "VCS-9999"))).scalar_one()
    assert result.name == "REDD+ Amazon"
    assert result.issued == 1_000_000
    assert result.sdg_goals == [13, 15]
    assert result.crediting_period_end == date(2030, 12, 31)
    assert result.additional_certifications == ["CCB"]
    assert result.estimated_annual_reductions == 100_000


@pytest.mark.asyncio
async def test_credit_creation(db):
    """Credits link to a project and store all fields correctly."""
    db.add(Project(project_id="GS-100", name="GS Solar", registry="gold-standard"))
    await db.commit()

    c = Credit(
        project_id="GS-100",
        quantity=5000,
        vintage=2022,
        transaction_date=date(2023, 5, 1),
        transaction_type="issuance",
        registry="gold-standard",
        is_planned=True,
    )
    db.add(c)
    await db.commit()

    result = (await db.execute(select(Credit).where(Credit.project_id == "GS-100"))).scalar_one()
    assert result.quantity == 5000
    assert result.is_planned is True
    assert result.transaction_type == "issuance"


@pytest.mark.asyncio
async def test_credit_retirement_fields(db):
    """Retirement-specific fields are stored correctly."""
    db.add(Project(project_id="VCS-5000", name="Wind Farm", registry="verra"))
    await db.commit()

    c = Credit(
        project_id="VCS-5000",
        quantity=10000,
        vintage=2021,
        transaction_date=date(2023, 12, 1),
        transaction_type="retirement",
        registry="verra",
        retirement_account="Corp Account #123",
        retirement_beneficiary="Mega Corp Inc.",
        retirement_reason="Voluntary cancellation",
        retirement_note="Q4 2023 offset",
        retirement_beneficiary_harmonized="mega-corp",
    )
    db.add(c)
    await db.commit()

    result = (await db.execute(select(Credit).where(Credit.project_id == "VCS-5000"))).scalar_one()
    assert result.retirement_beneficiary == "Mega Corp Inc."
    assert result.retirement_beneficiary_harmonized == "mega-corp"
    assert result.retirement_reason == "Voluntary cancellation"


@pytest.mark.asyncio
async def test_event_creation(db):
    """Events store change detection data with JSONB values."""
    e = Event(
        event_type="status_change",
        project_id="VCS-1000",
        registry="verra",
        timestamp=datetime(2024, 6, 1, 12, 0, 0),
        old_value={"status": "listed"},
        new_value={"status": "registered"},
    )
    db.add(e)
    await db.commit()

    result = (await db.execute(select(Event).where(Event.project_id == "VCS-1000"))).scalar_one()
    assert result.event_type == "status_change"
    assert result.old_value == {"status": "listed"}
    assert result.new_value == {"status": "registered"}


@pytest.mark.asyncio
async def test_developer_project_link(db):
    """Many-to-many relationship between projects and developers works."""
    p = Project(project_id="VCS-7777", name="Mangrove Restoration", registry="verra")
    db.add(p)
    d = ProjectDeveloper(
        id="blue-carbon-inc",
        name="Blue Carbon Inc.",
        project_count=1,
        total_issued=20000,
        countries=["Indonesia"],
        registries=["verra"],
    )
    db.add(d)
    await db.commit()

    link = ProjectDeveloperLink(project_id="VCS-7777", developer_id="blue-carbon-inc")
    db.add(link)
    await db.commit()

    result = (await db.execute(
        select(ProjectDeveloperLink).where(ProjectDeveloperLink.project_id == "VCS-7777")
    )).scalar_one()
    assert result.developer_id == "blue-carbon-inc"


@pytest.mark.asyncio
async def test_bigint_quantities(db):
    """Large credit quantities (billions) are handled by BigInteger columns."""
    db.add(Project(project_id="VCS-LARGE", name="Big Project", registry="verra", issued=5_000_000_000, retired=2_500_000_000))
    await db.commit()

    result = (await db.execute(select(Project).where(Project.project_id == "VCS-LARGE"))).scalar_one()
    assert result.issued == 5_000_000_000
    assert result.retired == 2_500_000_000
