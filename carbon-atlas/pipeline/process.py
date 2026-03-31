"""
ETL pipeline orchestrator for carbon market data.

Reads raw registry CSVs, harmonizes schemas across registries, enriches with
additional fields (SDGs, crediting periods, extended statuses, etc.),
and upserts everything to PostgreSQL.

Usage:
    PYTHONPATH=. python pipeline/process.py
    PYTHONPATH=. python pipeline/process.py --registries verra
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import warnings
from datetime import date, datetime
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.developer_normalization import normalize_developer_name, pick_canonical_name
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# offsets-db-data processors (pandas-flavor methods)
from offsets_db_data.apx import process_apx_credits, process_apx_projects  # noqa: F401
from offsets_db_data.gld import process_gld_credits, process_gld_projects  # noqa: F401
from offsets_db_data.vcs import process_vcs_credits, process_vcs_projects  # noqa: F401

from api.db.models import Credit, Event, Project, ProjectDeveloper, ProjectDeveloperLink
from pipeline.change_detection import detect_credit_changes, detect_project_changes
from pipeline.extended_schema import (
    extract_apx_project_extras,
    extract_gold_standard_project_extras,
    extract_verra_credit_extras,
    extract_verra_project_extras,
    merge_extras_into_projects,
)
from pipeline.project_types import apply_berkeley_project_types
from pipeline.reduction_removal import apply_reduction_removal
from pipeline.status_mapping import apply_extended_status

warnings.filterwarnings("ignore", category=FutureWarning)

# Load environment
load_dotenv(".env.market")
load_dotenv()

RAW_DIR = Path(
    os.environ.get(
        "RAW_DATA_DIR",
        str(Path.home() / "projects" / "carbon-market-explorer" / "data" / "raw"),
    )
)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://carbon:carbon@localhost:5432/carbon_market",
)

# Files expected per registry
REGISTRY_CONFIG = {
    "verra": {
        "projects": "projects.csv",
        "credits": [{"file": "vcus.csv", "type": "mixed"}],
    },
    "gold-standard": {
        "projects": "projects.csv",
        "credits": [
            {"file": "GSF Registry Credits Export 2026-03-12-issuances.csv", "type": "issuance"},
            {"file": "GSF Registry Credits Export 2026-03-12-retirements.csv", "type": "retirement"},
        ],
    },
    "american-carbon-registry": {
        "projects": "projects.csv",
        "credits": [
            {"file": "issuances.csv", "type": "issuance"},
            {"file": "retirements.csv", "type": "retirement"},
            {"file": "cancellations.csv", "type": "cancellation"},
        ],
    },
    "climate-action-reserve": {
        "projects": "projects.csv",
        "credits": [
            {"file": "issuances.csv", "type": "issuance"},
            {"file": "retirements.csv", "type": "retirement"},
            {"file": "cancellations.csv", "type": "cancellation"},
        ],
    },
    "art-trees": {
        "projects": "projects.csv",
        "credits": [
            {"file": "issuances.csv", "type": "issuance"},
            {"file": "retirements.csv", "type": "retirement"},
            {"file": "cancellations.csv", "type": "cancellation"},
        ],
    },
}

# APX-based registries share the same processor
APX_REGISTRIES = {"american-carbon-registry", "climate-action-reserve", "art-trees"}

BATCH_SIZE = 2000


# ── Helpers ─────────────────────────────────────────────────────────────


def _to_native(val):
    """Convert numpy/pandas scalars to native Python types for DB insertion."""
    if val is None or val is pd.NaT:
        return None
    if isinstance(val, type(pd.NaT)):
        return None
    try:
        if pd.isna(val):
            return None
    except (ValueError, TypeError):
        pass
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return None if np.isnan(val) else float(val)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    if isinstance(val, pd.Timestamp):
        return val.date()
    if isinstance(val, (np.ndarray,)):
        return val.tolist()
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return None
    return val


def _slugify(name: str) -> str:
    """Convert a name to a URL-safe slug."""
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s)
    return s[:200]


# ── APX column normalization ─────────────────────────────────────────────

# The upstream mapping expects certain column names that may differ from
# the raw data downloaded from APX registries (e.g., "(GMT)" suffixes).
_ACR_CREDIT_RENAMES = {
    "issuance": {"Date Issued": "Date Issued (GMT)"},
    "retirement": {"Status Effective": "Status Effective (GMT)"},
    "cancellation": {"Status Effective": "Status Effective  (GMT)"},
}


def _normalize_apx_credit_columns(
    df: pd.DataFrame, registry: str, download_type: str
) -> pd.DataFrame:
    """Rename columns to match what process_apx_credits expects."""
    renames = {}
    if registry == "american-carbon-registry":
        renames = _ACR_CREDIT_RENAMES.get(download_type, {})
    return df.rename(columns=renames) if renames else df


# ── Credit processing ───────────────────────────────────────────────────


def process_credits(registry: str) -> pd.DataFrame | None:
    """Process credit transactions using offsets-db-data processors."""
    cfg = REGISTRY_CONFIG.get(registry)
    if cfg is None or "credits" not in cfg:
        return None

    if registry == "verra":
        credit_path = RAW_DIR / registry / cfg["credits"][0]["file"]
        if not credit_path.exists():
            return None
        print(f"  Reading {credit_path.name}...")
        # MUST read Verra VCUs with dtype=str
        df = pd.read_csv(credit_path, dtype=str)
        print(f"  Raw VCU rows: {len(df)}")
        result = df.process_vcs_credits()
        result["registry"] = "verra"
        print(f"  Processed: {len(result)} credit rows")
        return result

    elif registry == "gold-standard":
        parts = []
        for entry in cfg["credits"]:
            credit_path = RAW_DIR / registry / entry["file"]
            if not credit_path.exists():
                print(f"  Credit file not found: {credit_path.name}")
                continue
            # Gold Standard CSVs use default dtypes (numeric columns stay numeric)
            df = pd.read_csv(credit_path)
            print(f"  Read {credit_path.name}: {len(df)} rows")
            # download_type must be PLURAL: "issuances" or "retirements"
            processed = df.process_gld_credits(download_type=entry["type"] + "s", prefix="GS")
            parts.append(processed)

        if not parts:
            return None
        result = pd.concat(parts, ignore_index=True)
        result["registry"] = "gold-standard"
        print(f"  Processed: {len(result)} credit rows")
        return result

    elif registry in APX_REGISTRIES:
        parts = []
        for entry in cfg["credits"]:
            credit_path = RAW_DIR / registry / entry["file"]
            if not credit_path.exists():
                print(f"  Credit file not found: {credit_path.name}")
                continue
            df = pd.read_csv(credit_path)
            print(f"  Read {credit_path.name}: {len(df)} rows")
            # Normalize column names to match the expected mapping
            df = _normalize_apx_credit_columns(df, registry, entry["type"])
            # download_type must be PLURAL: "issuances", "retirements", "cancellations"
            processed = df.process_apx_credits(
                download_type=entry["type"] + "s",
                registry_name=registry,
            )
            parts.append(processed)

        if not parts:
            return None
        result = pd.concat(parts, ignore_index=True)
        result["registry"] = registry
        print(f"  Processed: {len(result)} credit rows")
        return result

    return None


# ── Project processing ──────────────────────────────────────────────────


def process_projects(registry: str, credits: pd.DataFrame) -> pd.DataFrame | None:
    """Process projects using offsets-db-data processors, enriched with credit totals."""
    cfg = REGISTRY_CONFIG.get(registry)
    if cfg is None:
        return None

    project_path = RAW_DIR / registry / cfg["projects"]
    if not project_path.exists():
        return None

    df = pd.read_csv(project_path)
    print(f"  Raw project rows: {len(df)}")

    if registry == "verra":
        result = df.process_vcs_projects(credits=credits)
    elif registry == "gold-standard":
        result = df.process_gld_projects(credits=credits, prefix="GS")
    elif registry in APX_REGISTRIES:
        result = df.process_apx_projects(credits=credits, registry_name=registry)
    else:
        return None

    # ACR: upstream mapping sets proponent=null but the raw CSV has
    # "Project Developer".  Backfill it from the raw dataframe.
    if registry == "american-carbon-registry" and "Project Developer" in df.columns:
        raw_devs = df.set_index("Project ID")["Project Developer"]
        missing = result["proponent"].isna()
        filled = result.loc[missing, "project_id"].map(raw_devs)
        result.loc[missing, "proponent"] = filled
        n = filled.notna().sum()
        if n:
            print(f"  Backfilled {n} ACR proponents from raw 'Project Developer' column")

    print(f"  Processed: {len(result)} projects")
    return result


# ── CORSIA eligibility ─────────────────────────────────────────────────


def _apply_corsia_eligible(df: pd.DataFrame, registry: str) -> pd.DataFrame:
    """Set corsia_eligible boolean from raw credit-level CORSIA flags.

    Sources:
    - Verra: derived from additional_certifications (already populated)
    - ACR/CAR/ART TREES: 'CORSIA Eligible' column in raw credit CSVs
    - Gold Standard: no data available
    """
    if registry == "verra":
        def _has_corsia(certs):
            if not isinstance(certs, list):
                return None
            return any("CORSIA" in str(c).upper() for c in certs)

        df["corsia_eligible"] = df["additional_certifications"].apply(_has_corsia)
        n = df["corsia_eligible"].sum()
        if n:
            print(f"  CORSIA eligible: {n} projects (from additional_certifications)")
        return df

    if registry in APX_REGISTRIES:
        cfg = REGISTRY_CONFIG[registry]
        pid_col = "Program ID" if registry == "art-trees" else "Project ID"
        corsia_pids: set[str] = set()

        for entry in cfg["credits"]:
            credit_path = RAW_DIR / registry / entry["file"]
            if not credit_path.exists():
                continue
            try:
                raw = pd.read_csv(credit_path, dtype=str, usecols=[pid_col, "CORSIA Eligible"])
            except (ValueError, KeyError):
                continue
            eligible = raw[raw["CORSIA Eligible"].str.strip().str.lower() == "yes"]
            corsia_pids.update(eligible[pid_col].dropna().unique())

        if corsia_pids:
            df["corsia_eligible"] = df["project_id"].isin(corsia_pids)
            n = df["corsia_eligible"].sum()
            print(f"  CORSIA eligible: {n} projects (from raw credit CSVs)")
        else:
            df["corsia_eligible"] = None
        return df

    # Gold Standard / unknown — no CORSIA data
    df["corsia_eligible"] = None
    return df


# ── Extended schema enrichment ──────────────────────────────────────────


def enrich_projects(df: pd.DataFrame, registry: str) -> pd.DataFrame:
    """Add fields beyond the harmonized schema: SDGs, crediting periods, status detail."""
    cfg = REGISTRY_CONFIG.get(registry)
    if cfg is None:
        return df

    raw_project_path = RAW_DIR / registry / cfg["projects"]

    if registry == "verra":
        # Extract extra project-level fields
        project_extras = extract_verra_project_extras(raw_project_path)
        df = merge_extras_into_projects(df, project_extras)

        # Extract credit-level extras (SDGs, additional certifications) aggregated per project
        raw_credit_path = RAW_DIR / registry / cfg["credits"][0]["file"]
        if raw_credit_path.exists():
            credit_extras = extract_verra_credit_extras(raw_credit_path)
            df = merge_extras_into_projects(df, credit_extras)

    elif registry == "gold-standard":
        project_extras = extract_gold_standard_project_extras(raw_project_path)
        df = merge_extras_into_projects(df, project_extras)
        # Re-apply project type overrides (the upstream file uses GLD prefix,
        # but we use GS prefix, so the built-in override misses them)
        df = apply_berkeley_project_types(df, old_prefix="GLD", new_prefix="GS")

    elif registry in APX_REGISTRIES:
        project_extras = extract_apx_project_extras(raw_project_path, registry)
        df = merge_extras_into_projects(df, project_extras)

    # Apply finer-grained status mapping (7+ statuses vs the base 3)
    df = apply_extended_status(df, registry)

    # Classify reduction vs removal from project_type
    df = apply_reduction_removal(df)

    # Derive CORSIA eligibility from raw credit data or additional_certifications
    df = _apply_corsia_eligible(df, registry)

    # Drop the temporary raw status column
    if "_raw_status" in df.columns:
        df = df.drop(columns=["_raw_status"])

    return df


# ── Developer aggregation ───────────────────────────────────────────────


def aggregate_developers(projects_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Create developer entities and link table from project proponents.

    Uses name normalization to merge variant spellings of the same entity
    (e.g. "South Pole Ltd" and "South Pole Ltd SCV" → single developer).
    The most common raw variant becomes the canonical display name.

    Returns (developers_df, links_df).
    """
    with_proponent = projects_df[projects_df["proponent"].notna()].copy()
    if with_proponent.empty:
        return pd.DataFrame(), pd.DataFrame()

    # Phase 1: collect raw name frequencies for canonical name selection
    name_freq: dict[str, dict[str, int]] = {}  # norm_key → {raw_name: count}

    for _, row in with_proponent.iterrows():
        proponent = str(row["proponent"]).strip()
        if not proponent:
            continue
        norm_key = normalize_developer_name(proponent)
        if not norm_key:
            continue
        name_freq.setdefault(norm_key, {})
        name_freq[norm_key][proponent] = name_freq[norm_key].get(proponent, 0) + 1

    # Phase 2: build canonical name map (norm_key → display name)
    canonical_names: dict[str, str] = {}
    for norm_key, variants in name_freq.items():
        canonical_names[norm_key] = pick_canonical_name(
            [(name, freq) for name, freq in variants.items()]
        )

    # Phase 3: aggregate developer stats using normalized keys
    developers: dict[str, dict] = {}
    links: list[dict] = []

    for _, row in with_proponent.iterrows():
        proponent = str(row["proponent"]).strip()
        if not proponent:
            continue

        norm_key = normalize_developer_name(proponent)
        if not norm_key:
            continue

        dev_id = _slugify(canonical_names[norm_key])
        if not dev_id:
            continue

        if dev_id not in developers:
            developers[dev_id] = {
                "id": dev_id,
                "name": canonical_names[norm_key],
                "project_count": 0,
                "total_issued": 0,
                "total_retired": 0,
                "countries": set(),
                "registries": set(),
                "categories": set(),
                "methodologies": set(),
            }

        dev = developers[dev_id]
        dev["project_count"] += 1
        dev["total_issued"] += int(row.get("issued") or 0) if pd.notna(row.get("issued")) else 0
        dev["total_retired"] += int(row.get("retired") or 0) if pd.notna(row.get("retired")) else 0

        if pd.notna(row.get("country")):
            dev["countries"].add(row["country"])
        if pd.notna(row.get("registry")):
            dev["registries"].add(row["registry"])
        if pd.notna(row.get("category")):
            dev["categories"].add(row["category"])

        protocol = row.get("protocol")
        if isinstance(protocol, list):
            for p in protocol:
                if isinstance(p, dict):
                    dev["methodologies"].add(p.get("name", str(p)))
                else:
                    dev["methodologies"].add(str(p))

        links.append({"project_id": row["project_id"], "developer_id": dev_id})

    # Convert sets to sorted lists
    for dev in developers.values():
        for field in ("countries", "registries", "categories", "methodologies"):
            dev[field] = sorted(dev[field]) if dev[field] else None

    merged = len(name_freq) - len(developers)
    if merged:
        print(f"  Developer normalization: merged {merged} duplicate variants")

    return pd.DataFrame(list(developers.values())), pd.DataFrame(links)


# ── DataFrame → dict conversion for DB ──────────────────────────────────


def _project_row_to_dict(row: pd.Series) -> dict:
    """Convert a project DataFrame row to a dict matching the Project model."""
    project_cols = {c.key for c in Project.__table__.columns}
    data = {}
    for col in project_cols:
        val = row.get(col)
        val = _to_native(val)

        if col in ("issued", "retired", "estimated_annual_reductions"):
            data[col] = int(val) if val is not None else None
        elif col in ("is_compliance", "corsia_eligible"):
            data[col] = bool(val) if val is not None else None
        elif col in ("protocol", "sdg_goals", "additional_certifications"):
            if isinstance(val, list):
                data[col] = json.dumps(val)
            elif isinstance(val, str):
                # Could be a JSON string already
                try:
                    json.loads(val)
                    data[col] = val
                except (json.JSONDecodeError, TypeError):
                    data[col] = None
            else:
                data[col] = None
        elif col in ("listed_at", "first_issuance_at", "first_retirement_at",
                      "crediting_period_start", "crediting_period_end", "registration_date"):
            if val is not None:
                if isinstance(val, date):
                    data[col] = val
                else:
                    try:
                        data[col] = pd.Timestamp(val).date()
                    except Exception:
                        data[col] = None
            else:
                data[col] = None
        else:
            data[col] = str(val) if val is not None else None

    return data


def _credit_row_to_dict(row: pd.Series) -> dict:
    """Convert a credit DataFrame row to a dict matching the Credit model."""
    data = {}
    for col in ("project_id", "quantity", "vintage", "transaction_date", "transaction_type",
                 "retirement_account", "retirement_beneficiary", "retirement_reason",
                 "retirement_note", "retirement_beneficiary_harmonized", "registry", "is_planned"):
        val = row.get(col)
        val = _to_native(val)

        if col == "quantity":
            data[col] = int(val) if val is not None else None
        elif col == "vintage":
            data[col] = int(val) if val is not None else None
        elif col == "is_planned":
            data[col] = bool(val) if val is not None else False
        elif col == "transaction_date":
            if val is not None:
                if isinstance(val, date):
                    data[col] = val
                else:
                    try:
                        data[col] = pd.Timestamp(val).date()
                    except Exception:
                        data[col] = None
            else:
                data[col] = None
        else:
            data[col] = str(val) if val is not None else None

    return data


# ── Database operations ─────────────────────────────────────────────────


async def upsert_to_db(
    projects_df: pd.DataFrame,
    credits_df: pd.DataFrame,
    developers_df: pd.DataFrame,
    links_df: pd.DataFrame,
):
    """Upsert all data to PostgreSQL."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionFactory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionFactory() as session:
        # Run change detection BEFORE upserting (compares incoming vs current DB state)
        print("\n── Change Detection ──")
        project_events = await detect_project_changes(session, projects_df)
        credit_events = await detect_credit_changes(session, credits_df)
        all_events = project_events + credit_events
        print(f"  {len(project_events)} project events, {len(credit_events)} credit events")

        # Upsert projects
        print("\n── Upserting Projects ──")
        await _upsert_projects(session, projects_df)

        # Upsert credits (delete + reinsert per registry)
        print("\n── Upserting Credits ──")
        await _upsert_credits(session, credits_df)

        # Upsert developers and links
        print("\n── Upserting Developers ──")
        await _upsert_developers(session, developers_df, links_df)

        # Insert change events
        if all_events:
            print(f"\n── Inserting {len(all_events)} Events ──")
            session.add_all(all_events)

        await session.commit()
        print("  Committed all changes")

    await engine.dispose()


async def _upsert_projects(session: AsyncSession, df: pd.DataFrame):
    """Upsert projects using PostgreSQL ON CONFLICT."""
    if df.empty:
        return

    rows = [_project_row_to_dict(row) for _, row in df.iterrows()]

    # Process in batches
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]

        # Use raw SQL for ON CONFLICT — more reliable with JSONB columns via asyncpg
        cols = list(batch[0].keys())
        placeholders = ", ".join(f":{c}" for c in cols)
        update_clause = ", ".join(
            f"{c} = EXCLUDED.{c}" for c in cols if c != "project_id"
        )

        sql = text(
            f"INSERT INTO projects ({', '.join(cols)}) "
            f"VALUES ({placeholders}) "
            f"ON CONFLICT (project_id) DO UPDATE SET {update_clause}"
        )

        for row_data in batch:
            await session.execute(sql, row_data)

    print(f"  Upserted {len(rows)} projects")


async def _upsert_credits(session: AsyncSession, df: pd.DataFrame):
    """Replace credits per registry (delete + batch insert)."""
    if df.empty:
        return

    # Get valid project_ids to filter orphaned credits
    result = await session.execute(text("SELECT project_id FROM projects"))
    valid_pids = {row[0] for row in result.all()}

    # Delete existing credits for affected registries
    for reg in df["registry"].unique():
        await session.execute(
            text("DELETE FROM credits WHERE registry = :reg"),
            {"reg": str(reg)},
        )

    # Filter to only credits with a matching project
    rows = [
        _credit_row_to_dict(row)
        for _, row in df.iterrows()
        if row.get("project_id") in valid_pids
    ]
    if not rows:
        print("  No credits with matching projects")
        return
    cols = list(rows[0].keys())
    placeholders = ", ".join(f":{c}" for c in cols)
    sql = text(
        f"INSERT INTO credits ({', '.join(cols)}) VALUES ({placeholders})"
    )

    count = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        for row_data in batch:
            await session.execute(sql, row_data)
        count += len(batch)
        if count % 50000 == 0 or count == len(rows):
            print(f"  Inserted {count}/{len(rows)} credits...")

    print(f"  Inserted {count} credits total")


async def _upsert_developers(session: AsyncSession, df: pd.DataFrame, links_df: pd.DataFrame):
    """Upsert developers and their project links."""
    if df.empty:
        return

    # Clear existing links only for projects in this batch
    project_ids = links_df["project_id"].unique().tolist()
    if project_ids:
        await session.execute(
            text("DELETE FROM project_developer_links WHERE project_id = ANY(:pids)"),
            {"pids": project_ids},
        )

    # Upsert developer records
    count = 0
    for _, row in df.iterrows():
        data = {
            "id": str(row["id"]),
            "name": str(row["name"]),
            "project_count": int(row["project_count"]),
            "total_issued": int(row["total_issued"]),
            "total_retired": int(row["total_retired"]),
            "countries": json.dumps(row.get("countries")) if row.get("countries") is not None else None,
            "registries": json.dumps(row.get("registries")) if row.get("registries") is not None else None,
            "categories": json.dumps(row.get("categories")) if row.get("categories") is not None else None,
            "methodologies": json.dumps(row.get("methodologies")) if row.get("methodologies") is not None else None,
        }

        sql = text(
            "INSERT INTO project_developers "
            "(id, name, project_count, total_issued, total_retired, "
            "countries, registries, categories, methodologies) "
            "VALUES (:id, :name, :project_count, :total_issued, :total_retired, "
            ":countries, :registries, :categories, :methodologies) "
            "ON CONFLICT (id) DO UPDATE SET "
            "name = EXCLUDED.name, "
            "project_count = EXCLUDED.project_count, "
            "total_issued = EXCLUDED.total_issued, "
            "total_retired = EXCLUDED.total_retired, "
            "countries = EXCLUDED.countries, "
            "registries = EXCLUDED.registries, "
            "categories = EXCLUDED.categories, "
            "methodologies = EXCLUDED.methodologies"
        )
        await session.execute(sql, data)
        count += 1

    # Insert links
    link_count = 0
    sql = text(
        "INSERT INTO project_developer_links (project_id, developer_id) "
        "VALUES (:project_id, :developer_id) "
        "ON CONFLICT DO NOTHING"
    )
    for _, row in links_df.iterrows():
        await session.execute(sql, {
            "project_id": str(row["project_id"]),
            "developer_id": str(row["developer_id"]),
        })
        link_count += 1

    # Clean up orphaned developer records (stale from previous runs)
    result = await session.execute(
        text(
            "DELETE FROM project_developers "
            "WHERE id NOT IN (SELECT DISTINCT developer_id FROM project_developer_links)"
        )
    )
    orphaned = result.rowcount
    if orphaned:
        print(f"  Cleaned up {orphaned} orphaned developer records")

    print(f"  Upserted {count} developers, {link_count} links")


# ── Main pipeline ───────────────────────────────────────────────────────


def run_pipeline(registries: list[str] | None = None):
    """Process all registries: credits first, then projects, then load to DB."""
    if registries is None:
        registries = [r for r in REGISTRY_CONFIG if (RAW_DIR / r).is_dir()]

    if not registries:
        print(f"No raw data directories found in {RAW_DIR}")
        return

    all_credits: list[pd.DataFrame] = []
    all_projects: list[pd.DataFrame] = []

    for registry in sorted(registries):
        print(f"\n{'=' * 60}")
        print(f"Processing {registry}")
        print(f"{'=' * 60}")

        # Credits first (projects need them for issued/retired totals)
        print("\n── Credits ──")
        credits = process_credits(registry)
        if credits is not None:
            all_credits.append(credits)
        else:
            print("  No credit data found")
            credits = pd.DataFrame()

        # Projects (credits are needed to compute issued/retired totals)
        print("\n── Projects ──")
        projects = process_projects(registry, credits)
        if projects is not None:
            projects = enrich_projects(projects, registry)
            all_projects.append(projects)
        else:
            print("  No project data found")

    if not all_projects:
        print("\nNo data to process.")
        return

    # Combine all registries
    unified_projects = pd.concat(all_projects, ignore_index=True)
    unified_credits = (
        pd.concat(all_credits, ignore_index=True) if all_credits else pd.DataFrame()
    )

    # Filter zero/null quantity credits
    if not unified_credits.empty and "quantity" in unified_credits.columns:
        unified_credits = unified_credits[
            unified_credits["quantity"].notna() & (unified_credits["quantity"] > 0)
        ]

    print(f"\n{'=' * 60}")
    print(f"Unified: {len(unified_projects)} projects, {len(unified_credits)} credits")
    print(f"{'=' * 60}")

    # Aggregate developers from proponent strings
    developers_df, links_df = aggregate_developers(unified_projects)
    print(f"Developers: {len(developers_df)} unique developers")

    # Upsert everything to PostgreSQL
    print(f"\nLoading into {DATABASE_URL.split('@')[-1]}...")
    asyncio.run(upsert_to_db(unified_projects, unified_credits, developers_df, links_df))

    print(f"\nPipeline complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process carbon registry data into PostgreSQL")
    parser.add_argument(
        "--registries",
        nargs="*",
        help="Registries to process (default: all with raw data)",
    )
    args = parser.parse_args()
    run_pipeline(args.registries)
