"""
Extended status mapping — 7+ statuses instead of the base 3.

The upstream harmonization collapses all registry statuses into: listed, registered, completed.
We preserve finer-grained statuses that carbon market users expect:
under_development, under_validation, registered, crediting, completed, withdrawn, inactive.
"""

from __future__ import annotations

import pandas as pd

# Verra raw status → our canonical status
VERRA_STATUS_MAP: dict[str, str] = {
    "Under development": "under_development",
    "Under validation": "under_validation",
    "Registration requested": "under_validation",
    "Registration and verification approval requested": "under_validation",
    "Registered": "registered",
    "Verification approval requested": "crediting",
    "Crediting Period Renewal Requested": "crediting",
    "Crediting Period Renewal and Verification Approval Requested": "crediting",
    "Units Transferred from Approved GHG Program": "registered",
    "Inactive": "inactive",
    "Withdrawn": "withdrawn",
    "Rejected by Administrator": "withdrawn",
    "Registration request denied": "withdrawn",
    "Registration and verification approval request denied": "withdrawn",
    "Verification approval request denied": "withdrawn",
    "On Hold - see notification letter": "on_hold",
    "Late to verify": "crediting",
}

# Gold Standard raw status → our canonical status
GOLD_STANDARD_STATUS_MAP: dict[str, str] = {
    "Listed": "listed",
    "Gold Standard Certified Design": "registered",
    "Gold Standard Certified Project": "crediting",
}

# ACR voluntary status → our canonical status
ACR_STATUS_MAP: dict[str, str] = {
    "Listed": "listed",
    "Registered": "registered",
    "Completed": "completed",
    "Canceled": "withdrawn",
    "Inactive": "inactive",
}

# CAR status → our canonical status
CAR_STATUS_MAP: dict[str, str] = {
    "Listed": "listed",
    "Registered": "registered",
    "Completed": "completed",
    "Transitioned": "completed",
}

# ART TREES status → our canonical status
ART_STATUS_MAP: dict[str, str] = {
    "Listed": "listed",
    "Registered": "registered",
}


def apply_extended_status(
    df: pd.DataFrame,
    registry: str,
    raw_status_column: str = "_raw_status",
) -> pd.DataFrame:
    """
    Replace the simplified base status with our finer-grained mapping.

    Expects `raw_status_column` to contain the original registry status string.
    Falls back to the existing `status` if no mapping found.
    """
    if raw_status_column not in df.columns:
        return df

    mapping = {
        "verra": VERRA_STATUS_MAP,
        "gold-standard": GOLD_STANDARD_STATUS_MAP,
        "american-carbon-registry": ACR_STATUS_MAP,
        "climate-action-reserve": CAR_STATUS_MAP,
        "art-trees": ART_STATUS_MAP,
    }.get(registry, {})

    if not mapping:
        return df

    df["status"] = df[raw_status_column].map(mapping).fillna(df["status"])
    return df
