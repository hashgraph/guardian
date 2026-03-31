"""
SQLModel table definitions for the carbon market data service.

Schema covers the harmonized fields from offsets-db-data plus extended fields:
SDGs, crediting periods, descriptions, additional certifications,
AFOLU activities, region, registration date, estimated annual reductions.
"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import BigInteger, Column, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel


# ---------------------------------------------------------------------------
# Junction table: project <-> developer (many-to-many)
# ---------------------------------------------------------------------------

class ProjectDeveloperLink(SQLModel, table=True):
    __tablename__ = "project_developer_links"

    project_id: str = Field(foreign_key="projects.project_id", primary_key=True)
    developer_id: str = Field(foreign_key="project_developers.id", primary_key=True)


# ---------------------------------------------------------------------------
# Project — 17 harmonized fields + 8 extended fields
# ---------------------------------------------------------------------------

class Project(SQLModel, table=True):
    __tablename__ = "projects"

    # --- Core harmonized fields ---
    project_id: str = Field(primary_key=True, index=True)
    name: Optional[str] = Field(default=None, index=True)
    registry: str = Field(index=True)
    proponent: Optional[str] = Field(default=None, index=True)
    protocol: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    category: Optional[str] = Field(default=None, index=True)
    status: Optional[str] = Field(default=None, index=True)
    country: Optional[str] = Field(default=None, index=True)
    listed_at: Optional[date] = None
    is_compliance: Optional[bool] = None
    retired: Optional[int] = Field(default=0, sa_column=Column(BigInteger, default=0))
    issued: Optional[int] = Field(default=0, sa_column=Column(BigInteger, default=0))
    first_issuance_at: Optional[date] = None
    first_retirement_at: Optional[date] = None
    project_url: Optional[str] = None
    project_type: Optional[str] = None
    project_type_source: Optional[str] = None

    # --- Extended fields ---
    sdg_goals: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    crediting_period_start: Optional[date] = None
    crediting_period_end: Optional[date] = None
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    additional_certifications: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    afolu_activities: Optional[str] = None
    region: Optional[str] = None
    registration_date: Optional[date] = None
    estimated_annual_reductions: Optional[int] = Field(
        default=None, sa_column=Column(BigInteger)
    )
    reduction_removal: Optional[str] = Field(default=None, index=True)

    # --- Relationships ---
    credits: list["Credit"] = Relationship(back_populates="project")
    developers: list["ProjectDeveloper"] = Relationship(
        back_populates="projects", link_model=ProjectDeveloperLink
    )


# ---------------------------------------------------------------------------
# Credit — harmonized schema + registry + is_planned flag
# ---------------------------------------------------------------------------

class Credit(SQLModel, table=True):
    __tablename__ = "credits"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: str = Field(foreign_key="projects.project_id", index=True)
    quantity: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    vintage: Optional[int] = None
    transaction_date: Optional[date] = Field(default=None, index=True)
    transaction_type: Optional[str] = Field(default=None, index=True)
    retirement_account: Optional[str] = None
    retirement_beneficiary: Optional[str] = None
    retirement_reason: Optional[str] = None
    retirement_note: Optional[str] = None
    retirement_beneficiary_harmonized: Optional[str] = None
    registry: Optional[str] = Field(default=None, index=True)
    is_planned: Optional[bool] = Field(default=False)

    # --- Relationship ---
    project: Optional["Project"] = Relationship(back_populates="credits")


# ---------------------------------------------------------------------------
# Event — change detection log
# ---------------------------------------------------------------------------

class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_type: str = Field(index=True)
    project_id: str = Field(index=True)
    registry: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    old_value: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    new_value: Optional[dict] = Field(default=None, sa_column=Column(JSONB))


# ---------------------------------------------------------------------------
# ProjectDeveloper — first-class entity, aggregated from proponent strings
# ---------------------------------------------------------------------------

class ProjectDeveloper(SQLModel, table=True):
    __tablename__ = "project_developers"

    id: str = Field(primary_key=True)
    name: str
    project_count: int = Field(default=0)
    total_issued: Optional[int] = Field(default=0, sa_column=Column(BigInteger, default=0))
    total_retired: Optional[int] = Field(default=0, sa_column=Column(BigInteger, default=0))
    countries: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    registries: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    categories: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    methodologies: Optional[list] = Field(default=None, sa_column=Column(JSONB))

    # --- Relationship ---
    projects: list["Project"] = Relationship(
        back_populates="developers", link_model=ProjectDeveloperLink
    )
