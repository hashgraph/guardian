"""
Static mapping from project_type to reduction/removal classification.

Project types are classified as:

- reduction: Avoids or reduces emissions (vast majority)
- impermanent_removal: Removes CO₂ but reversal is possible (forests, biochar)
- long_duration_removal: Removes CO₂ with high permanence (DAC, BECCS, mineral)
- mixed: Both reduces and removes depending on project specifics

This is a pure static lookup — no external dataset dependency.
"""

from __future__ import annotations

import pandas as pd

# project_type value → reduction_removal classification
REDUCTION_REMOVAL_MAP: dict[str, str] = {
    # ── Reduction ──────────────────────────────────────────────────────
    "Aluminum Smelter": "reduction",
    "Avoided Grassland Conversion": "reduction",
    "Bicycle": "reduction",
    "Biomass": "reduction",
    "Borehole": "reduction",
    "Brick Manufacturing": "reduction",
    "Centralized Solar": "reduction",
    "Clean Water": "reduction",
    "Cookstove": "reduction",
    "Distributed Solar": "reduction",
    "Electric Vehicle": "reduction",
    "Energy Efficiency": "reduction",
    "Feed Additive": "reduction",
    "Fleet Efficiency": "reduction",
    "Fuel Switching": "reduction",
    "Fuel Transport": "reduction",
    "Gas Leak Repair": "reduction",
    "Geothermal": "reduction",
    "Grid Improvements": "reduction",
    "HFC Destruction": "reduction",
    "Hydropower": "reduction",
    "Landfill": "reduction",
    "Lighting": "reduction",
    "Manure Biodigester": "reduction",
    "Mass Transit": "reduction",
    "Methane Biodigester": "reduction",
    "Mine Methane": "reduction",
    "N\u2082O Destruction (Nitric Acid)": "reduction",
    "Natural Gas": "reduction",
    "Nitrogen Management": "reduction",
    "Ozone Depleting Substances": "reduction",
    "Plastic CCS": "reduction",
    "Propylene Oxide": "reduction",
    "REDD+": "reduction",
    "Recycling": "reduction",
    "Refrigerant Leak": "reduction",
    "Renewable Energy": "reduction",
    "Rice Emission": "reduction",
    "Road Construction": "reduction",
    "SF\u2086 Replacement": "reduction",
    "Shipping": "reduction",
    "Solar Water Heater": "reduction",
    "Solid Waste Separation": "reduction",
    "University": "reduction",
    "Waste Diversion": "reduction",
    "Waste Gas Recovery": "reduction",
    "Waste Heat Recovery": "reduction",
    "Waste Incineration": "reduction",
    "Waste Reduction": "reduction",
    "Wastewater Methane": "reduction",
    "Weatherization": "reduction",
    "Wind": "reduction",
    # ── Impermanent Removal ────────────────────────────────────────────
    "Afforestation + Reforestation": "impermanent_removal",
    "Biochar": "impermanent_removal",
    # ── Long-Duration Removal ──────────────────────────────────────────
    "Concrete CCS": "long_duration_removal",
    # ── Mixed (reduction + removal depending on specifics) ─────────────
    "Compost": "mixed",
    "Grassland Management": "mixed",
    "Improved Forest Management": "mixed",
    "Improved Irrigation Management": "mixed",
    "Sustainable Agriculture": "mixed",
    "Wetland": "mixed",
}


def apply_reduction_removal(df: pd.DataFrame) -> pd.DataFrame:
    """Add reduction_removal column based on project_type mapping."""
    df["reduction_removal"] = df["project_type"].map(REDUCTION_REMOVAL_MAP)
    return df
