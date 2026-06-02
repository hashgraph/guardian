"""
Re-apply project type overrides when project ID prefix differs.

The upstream override file uses GLD prefix for Gold Standard projects,
but we use GS to match the actual registry convention. This module maps the
overrides to the correct prefix.
"""

from __future__ import annotations

import json

import pandas as pd
from offsets_db_data.common import BERKELEY_PROJECT_TYPE_UPATH, load_type_category_mapping


def apply_berkeley_project_types(
    df: pd.DataFrame,
    old_prefix: str = "GLD",
    new_prefix: str = "GS",
) -> pd.DataFrame:
    """
    Re-apply project type overrides with remapped project ID prefix.

    The upstream override file keys projects as e.g. GLD447, but our IDs use
    GS447. This function loads the overrides, remaps the keys, and applies them.
    Also re-derives display names and categories from the type_category_mapping.
    """
    raw = json.loads(BERKELEY_PROJECT_TYPE_UPATH.read_text())
    type_category_mapping = load_type_category_mapping()

    # Build lookup: raw_type (lowercase) -> display_name, category
    display_names = {}
    categories = {}
    for raw_type, info in type_category_mapping.items():
        display_name = info.get("project-type-display-name", raw_type)
        category = info.get("category", "unknown")
        display_names[raw_type] = display_name
        categories[display_name] = category

    # Remap keys: GLD447 -> GS447
    remapped = {}
    for key, value in raw.items():
        if key.startswith(old_prefix):
            new_key = new_prefix + key[len(old_prefix):]
            remapped[new_key] = value

    if not remapped:
        return df

    # Apply overrides: raw type -> display name -> category
    matched = df["project_id"].isin(remapped)
    raw_types = df.loc[matched, "project_id"].map(remapped)
    df.loc[matched, "project_type"] = raw_types.map(display_names).fillna(raw_types)
    df.loc[matched, "project_type_source"] = "berkeley"
    df.loc[matched, "category"] = df.loc[matched, "project_type"].map(categories).fillna("unknown")

    overridden = matched.sum()
    print(f"  Re-applied {overridden} project type overrides ({old_prefix} -> {new_prefix})")
    return df
