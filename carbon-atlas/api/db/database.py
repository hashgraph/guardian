"""
Async database engine and session factory.

Reads DATABASE_URL from environment. Designed for use with FastAPI's
dependency injection.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://carbon:carbon@localhost:5432/carbon_market",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={"server_settings": {"timezone": "utc"}},
)

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


async def create_db_and_tables():
    """Create all tables — used for development/testing only. Use Alembic in production."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
