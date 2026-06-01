"""
Extract fields from raw CSVs that the base harmonization drops.

These fields are valuable to carbon market users but not part of the upstream
harmonized schema. We re-read the raw CSVs and merge the extra fields into
the harmonized DataFrame by project_id.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def extract_verra_project_extras(raw_path: Path) -> pd.DataFrame:
    """
    Extract extended fields from Verra projects.csv beyond the harmonized schema.

    Returns DataFrame indexed by project_id with columns:
    - estimated_annual_reductions
    - afolu_activities
    - region
    - registration_date
    - crediting_period_start
    - crediting_period_end
    """
    df = pd.read_csv(raw_path)

    extras = pd.DataFrame()
    extras["project_id"] = "VCS" + df["ID"].astype(str)
    extras["_raw_status"] = df["Status"]
    extras["estimated_annual_reductions"] = pd.to_numeric(
        df.get("Estimated Annual Emission Reductions", pd.Series(dtype="object"))
        .astype(str)
        .str.replace(",", ""),
        errors="coerce",
    )
    extras["afolu_activities"] = df.get("AFOLU Activities")
    extras["region"] = df.get("Region")
    extras["registration_date"] = pd.to_datetime(
        df.get("Project Registration Date"), errors="coerce", dayfirst=True
    ).dt.date
    extras["crediting_period_start"] = pd.to_datetime(
        df.get("Crediting Period Start Date"), errors="coerce", dayfirst=True
    ).dt.date
    extras["crediting_period_end"] = pd.to_datetime(
        df.get("Crediting Period End Date"), errors="coerce", dayfirst=True
    ).dt.date

    return extras.set_index("project_id")


def extract_verra_credit_extras(raw_path: Path) -> pd.DataFrame:
    """
    Extract SDG goals and additional certifications from Verra VCUs CSV.

    These are per-credit-transaction but we aggregate them per project.
    Returns DataFrame indexed by project_id.
    """
    df = pd.read_csv(raw_path, dtype=str)

    extras = pd.DataFrame()
    extras["project_id"] = "VCS" + df["ID"].astype(str)
    extras["sdg_goals_raw"] = df.get("Sustainable Development Goals", pd.Series(dtype="object"))
    extras["additional_certifications_raw"] = df.get("Additional Certifications", pd.Series(dtype="object"))

    # Aggregate: collect unique SDGs and certs per project
    import re as _re

    def _parse_list(series: pd.Series, exclude_sdg_pattern: bool = False) -> list:
        items = set()
        for val in series.dropna().unique():
            for item in str(val).split(";"):
                item = item.strip()
                if item and item.lower() not in ("", "nan", "none"):
                    if exclude_sdg_pattern and _re.match(r"^\d{2}:", item):
                        continue
                    items.add(item)
        return sorted(items) if items else None

    grouped = extras.groupby("project_id")
    result = pd.DataFrame(index=grouped.groups.keys())
    result.index.name = "project_id"

    sdg_agg = grouped["sdg_goals_raw"].apply(_parse_list)
    cert_agg = grouped["additional_certifications_raw"].apply(
        lambda s: _parse_list(s, exclude_sdg_pattern=True)
    )

    result["sdg_goals"] = sdg_agg
    result["additional_certifications"] = cert_agg

    return result


def extract_gold_standard_project_extras(raw_path: Path) -> pd.DataFrame:
    """
    Extract extended fields from Gold Standard projects.csv.

    Returns DataFrame indexed by project_id with columns:
    - sdg_goals
    - description
    - estimated_annual_reductions
    """
    df = pd.read_csv(raw_path)

    extras = pd.DataFrame()
    extras["project_id"] = "GS" + df["GSID"].astype(str)
    extras["_raw_status"] = df["Status"]
    extras["description"] = df.get("Description")

    # Parse SDG goals (may be semicolon-separated)
    sdg_raw = df.get("Sustainable Development Goals", pd.Series(dtype="object"))
    extras["sdg_goals"] = sdg_raw.apply(
        lambda x: _parse_sdg_string(x) if pd.notna(x) else None
    )

    extras["estimated_annual_reductions"] = pd.to_numeric(
        df.get("Estimated Annual Credits", pd.Series(dtype="object"))
        .astype(str)
        .str.replace(",", ""),
        errors="coerce",
    )

    return extras.set_index("project_id")


def extract_apx_project_extras(raw_path: Path, registry: str) -> pd.DataFrame:
    """
    Extract extended fields from APX-based registry projects.csv (ACR, CAR, ART TREES).

    Returns DataFrame indexed by project_id with columns:
    - _raw_status
    - sdg_goals (ACR, CAR)
    - additional_certifications (CAR)
    - crediting_period_start (ACR)
    - crediting_period_end (ACR)
    - registration_date (CAR)
    """
    df = pd.read_csv(raw_path)

    extras = pd.DataFrame()

    # Project ID column name varies by registry
    if registry == "art-trees":
        id_col = "Program ID"
        prefix = ""  # ART IDs already have "ART" prefix
    else:
        id_col = "Project ID"
        prefix = ""  # ACR/CAR IDs already have prefix

    extras["project_id"] = df[id_col].astype(str)

    # Raw status for extended status mapping
    if registry == "american-carbon-registry":
        extras["_raw_status"] = df["Voluntary Status"]
    elif registry == "climate-action-reserve":
        extras["_raw_status"] = df["Status"]
    elif registry == "art-trees":
        extras["_raw_status"] = df["Status"]

    # SDG goals
    if registry == "american-carbon-registry":
        sdg_raw = df.get("Sustainable Development Goal(s)", pd.Series(dtype="object"))
        extras["sdg_goals"] = sdg_raw.apply(
            lambda x: _parse_sdg_string(x) if pd.notna(x) else None
        )
    elif registry == "climate-action-reserve":
        sdg_raw = df.get("SDG Impact", pd.Series(dtype="object"))
        extras["sdg_goals"] = sdg_raw.apply(
            lambda x: _parse_sdg_string(x) if pd.notna(x) else None
        )

    # Additional certifications (CAR)
    if registry == "climate-action-reserve":
        cert_raw = df.get("Additional Certification(s)", pd.Series(dtype="object"))
        extras["additional_certifications"] = cert_raw.apply(
            lambda x: _parse_cert_string(x) if pd.notna(x) else None
        )

    # Crediting period (ACR)
    if registry == "american-carbon-registry":
        extras["crediting_period_start"] = pd.to_datetime(
            df.get("Current Crediting Period Start Date"), errors="coerce"
        ).dt.date
        extras["crediting_period_end"] = pd.to_datetime(
            df.get("Current Crediting Period End Date"), errors="coerce"
        ).dt.date

    # Registration date (CAR)
    if registry == "climate-action-reserve":
        extras["registration_date"] = pd.to_datetime(
            df.get("Project Registered Date"), errors="coerce"
        ).dt.date

    return extras.set_index("project_id")


def _parse_cert_string(s: str) -> list | None:
    """Parse additional certifications from semicolon-separated string."""
    if not s or str(s).lower() in ("nan", "none", ""):
        return None
    import re
    parts = re.split(r"[;,]", str(s))
    items = [p.strip() for p in parts if p.strip() and p.strip().lower() not in ("nan", "none")]
    return sorted(set(items)) if items else None


_SDG_LABELS = {
    "1": "01: No Poverty",
    "2": "02: Zero Hunger",
    "3": "03: Good Health and Well-being",
    "4": "04: Quality Education",
    "5": "05: Gender Equality",
    "6": "06: Clean Water and Sanitation",
    "7": "07: Affordable and Clean Energy",
    "8": "08: Decent Work and Economic Growth",
    "9": "09: Industry, Innovation and Infrastructure",
    "10": "10: Reduced Inequalities",
    "11": "11: Sustainable Cities and Communities",
    "12": "12: Responsible Consumption and Production",
    "13": "13: Climate Action",
    "14": "14: Life Below Water",
    "15": "15: Life on Land",
    "16": "16: Peace, Justice, and Strong Institutions",
    "17": "17: Partnerships for the Goals",
}


def _parse_sdg_string(s: str) -> list | None:
    """Parse SDG goals from '3,7,5,13' or '01: No Poverty; 02: Zero Hunger' etc."""
    if not s or str(s).lower() in ("nan", "none", ""):
        return None
    import re

    # Split on comma or semicolon
    parts = re.split(r"[;,]", str(s))
    items = []
    for part in parts:
        cleaned = part.strip()
        # Remove "SDG" prefix if present
        bare = re.sub(r"^SDG\s*", "", cleaned, flags=re.IGNORECASE).strip()
        if not bare:
            continue
        # If it's a bare number, map to full label
        if bare.isdigit():
            bare = _SDG_LABELS.get(bare, bare)
        items.append(bare)
    return sorted(set(items)) if items else None


def merge_extras_into_projects(
    projects_df: pd.DataFrame,
    extras: pd.DataFrame,
) -> pd.DataFrame:
    """Merge extracted extra fields into the harmonized projects DataFrame."""
    if extras is None or extras.empty:
        return projects_df

    # Only merge columns that don't already exist (or are NaN)
    cols_to_merge = [c for c in extras.columns if c != "_raw_status"]
    for col in cols_to_merge:
        if col not in projects_df.columns:
            projects_df[col] = None

    # Merge by project_id
    projects_df = projects_df.set_index("project_id")
    for col in cols_to_merge:
        if col in extras.columns:
            projects_df[col] = projects_df[col].fillna(extras[col])
    projects_df = projects_df.reset_index()

    # Keep raw status for extended status mapping
    if "_raw_status" in extras.columns:
        raw_status = extras["_raw_status"]
        projects_df = projects_df.set_index("project_id")
        projects_df["_raw_status"] = raw_status
        projects_df = projects_df.reset_index()

    return projects_df
