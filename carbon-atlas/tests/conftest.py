"""
Shared fixtures for API tests.

Strategy: Set DATABASE_URL to the test database. Override the app's
get_session dependency to use our NullPool engine (avoids event loop
and connection pool conflicts).
"""

import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import NullPool, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

# Point to test database before any app imports
TEST_DB = os.environ.get(
    "TEST_DATABASE_URL",
    f"postgresql+asyncpg://{os.environ.get('USER', 'postgres')}@localhost:5432/carbon_market_test",
)
os.environ["DATABASE_URL"] = TEST_DB

from api.db.database import get_session  # noqa: E402
from api.db.models import Credit, Event, Project, ProjectDeveloper, ProjectDeveloperLink  # noqa: E402, F401
from api.main import app  # noqa: E402

# NullPool: one fresh connection per session — no stale pool issues across event loops
_engine = create_async_engine(TEST_DB, poolclass=NullPool)
_SessionFactory = sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_tables():
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await _engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def _clean_and_override():
    """Override get_session so the app uses our NullPool engine. Truncate after each test."""
    async def _override():
        async with _SessionFactory() as s:
            yield s

    app.dependency_overrides[get_session] = _override
    yield
    app.dependency_overrides.clear()

    async with _SessionFactory() as s:
        await s.execute(text(
            "TRUNCATE project_developer_links, credits, events, project_developers, projects CASCADE"
        ))
        await s.commit()


@pytest_asyncio.fixture
async def db():
    """A session for test fixtures to insert/query data directly."""
    async with _SessionFactory() as s:
        yield s


@pytest_asyncio.fixture
async def client():
    """HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Sample data fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def sample_project(db: AsyncSession) -> Project:
    project = Project(
        project_id="VCS-1234",
        name="Improved Cookstoves Kenya",
        registry="verra",
        proponent="Test Developer Ltd.",
        protocol=["VM0065"],
        category="energy-efficiency",
        status="registered",
        country="Kenya",
        issued=50000,
        retired=12000,
        project_url="https://registry.verra.org/app/projectDetail/VCS/1234",
        project_type="cookstoves",
        sdg_goals=[7, 13],
        estimated_annual_reductions=25000,
        description="Improved cookstoves project in rural Kenya",
    )
    db.add(project)
    await db.commit()
    return project


@pytest_asyncio.fixture
async def sample_credits(db: AsyncSession, sample_project: Project) -> list[Credit]:
    from datetime import date

    credits = [
        Credit(
            project_id="VCS-1234",
            quantity=30000,
            vintage=2023,
            transaction_date=date(2024, 3, 15),
            transaction_type="issuance",
            registry="verra",
        ),
        Credit(
            project_id="VCS-1234",
            quantity=20000,
            vintage=2024,
            transaction_date=date(2024, 9, 1),
            transaction_type="issuance",
            registry="verra",
        ),
        Credit(
            project_id="VCS-1234",
            quantity=12000,
            vintage=2023,
            transaction_date=date(2024, 6, 20),
            transaction_type="retirement",
            registry="verra",
            retirement_beneficiary="Acme Corp",
        ),
    ]
    for c in credits:
        db.add(c)
    await db.commit()
    return credits


@pytest_asyncio.fixture
async def sample_developer(db: AsyncSession, sample_project: Project) -> ProjectDeveloper:
    dev = ProjectDeveloper(
        id="test-developer-ltd",
        name="Test Developer Ltd.",
        project_count=1,
        total_issued=50000,
        total_retired=12000,
        countries=["Kenya"],
        registries=["verra"],
        categories=["energy-efficiency"],
        methodologies=["VM0065"],
    )
    db.add(dev)
    link = ProjectDeveloperLink(project_id="VCS-1234", developer_id="test-developer-ltd")
    db.add(link)
    await db.commit()
    return dev


@pytest_asyncio.fixture
async def sample_event(db: AsyncSession, sample_project: Project) -> Event:
    from datetime import datetime
    event = Event(
        event_type="new_project",
        project_id="VCS-1234",
        registry="verra",
        timestamp=datetime(2024, 1, 15, 10, 0, 0),
        new_value={"name": "Improved Cookstoves Kenya", "status": "registered"},
    )
    db.add(event)
    await db.commit()
    return event
