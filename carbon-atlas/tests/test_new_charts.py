"""
Tests for new chart endpoints: credits-remaining-by-vintage,
projects-by-country-map, reduction-removal-breakdown.
Also tests the reduction_removal pipeline mapping.
"""

import pytest
from datetime import date

from api.db.models import Credit, Project
from pipeline.reduction_removal import REDUCTION_REMOVAL_MAP, apply_reduction_removal


# ---------------------------------------------------------------------------
# Pipeline: reduction_removal mapping
# ---------------------------------------------------------------------------


class TestReductionRemovalMap:
    def test_cookstove_is_reduction(self):
        assert REDUCTION_REMOVAL_MAP["Cookstove"] == "reduction"

    def test_redd_is_reduction(self):
        assert REDUCTION_REMOVAL_MAP["REDD+"] == "reduction"

    def test_afforestation_is_impermanent_removal(self):
        assert REDUCTION_REMOVAL_MAP["Afforestation + Reforestation"] == "impermanent_removal"

    def test_biochar_is_impermanent_removal(self):
        assert REDUCTION_REMOVAL_MAP["Biochar"] == "impermanent_removal"

    def test_concrete_ccs_is_long_duration(self):
        assert REDUCTION_REMOVAL_MAP["Concrete CCS"] == "long_duration_removal"

    def test_ifm_is_mixed(self):
        assert REDUCTION_REMOVAL_MAP["Improved Forest Management"] == "mixed"

    def test_wetland_is_mixed(self):
        assert REDUCTION_REMOVAL_MAP["Wetland"] == "mixed"

    def test_unknown_not_in_map(self):
        assert "Unknown" not in REDUCTION_REMOVAL_MAP

    def test_apply_to_dataframe(self):
        import pandas as pd
        df = pd.DataFrame({
            "project_type": ["Cookstove", "Biochar", "Improved Forest Management", None],
        })
        result = apply_reduction_removal(df)
        vals = result["reduction_removal"].tolist()
        assert vals[0] == "reduction"
        assert vals[1] == "impermanent_removal"
        assert vals[2] == "mixed"
        assert pd.isna(vals[3])  # NaN for unmapped None project_type

    def test_all_values_are_valid(self):
        valid = {"reduction", "impermanent_removal", "long_duration_removal", "mixed"}
        for pt, rr in REDUCTION_REMOVAL_MAP.items():
            assert rr in valid, f"{pt} mapped to invalid value: {rr}"


# ---------------------------------------------------------------------------
# API: credits-remaining-by-vintage
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_credits_remaining_empty(client):
    resp = await client.get("/api/v1/charts/credits-remaining-by-vintage")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_credits_remaining_with_data(client, sample_credits):
    resp = await client.get("/api/v1/charts/credits-remaining-by-vintage")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2  # vintage 2023 and 2024

    v2023 = next(d for d in data if d["vintage"] == 2023)
    assert v2023["issued"] == 30000
    assert v2023["retired"] == 12000
    assert v2023["remaining"] == 18000

    v2024 = next(d for d in data if d["vintage"] == 2024)
    assert v2024["issued"] == 20000
    assert v2024["retired"] == 0
    assert v2024["remaining"] == 20000


@pytest.mark.asyncio
async def test_credits_remaining_filter_registry(client, db):
    # Create projects in two registries
    db.add(Project(project_id="VCS-100", name="V", registry="verra", country="India"))
    db.add(Project(project_id="GS-100", name="G", registry="gold-standard", country="Kenya"))
    await db.flush()
    db.add(Credit(project_id="VCS-100", quantity=1000, vintage=2023, transaction_type="issuance", registry="verra"))
    db.add(Credit(project_id="GS-100", quantity=500, vintage=2023, transaction_type="issuance", registry="gold-standard"))
    await db.commit()

    resp = await client.get("/api/v1/charts/credits-remaining-by-vintage?registry=verra")
    data = resp.json()
    assert len(data) == 1
    assert data[0]["issued"] == 1000


# ---------------------------------------------------------------------------
# API: projects-by-country-map
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_country_map_empty(client):
    resp = await client.get("/api/v1/charts/projects-by-country-map")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_country_map_with_data(client, db):
    db.add(Project(project_id="VCS-1", name="A", registry="verra", country="India", issued=100, retired=50))
    db.add(Project(project_id="VCS-2", name="B", registry="verra", country="India", issued=200, retired=30))
    db.add(Project(project_id="VCS-3", name="C", registry="verra", country="Brazil", issued=500, retired=100))
    await db.commit()

    resp = await client.get("/api/v1/charts/projects-by-country-map")
    data = resp.json()
    assert len(data) == 2

    india = next(d for d in data if d["country"] == "India")
    assert india["iso3"] == "IND"
    assert india["count"] == 2
    assert india["issued"] == 300
    assert india["retired"] == 80

    brazil = next(d for d in data if d["country"] == "Brazil")
    assert brazil["iso3"] == "BRA"
    assert brazil["count"] == 1


@pytest.mark.asyncio
async def test_country_map_excludes_unmapped_countries(client, db):
    db.add(Project(project_id="VCS-1", name="X", registry="verra", country="Atlantis"))
    await db.commit()

    resp = await client.get("/api/v1/charts/projects-by-country-map")
    data = resp.json()
    assert len(data) == 0  # Atlantis has no ISO3 mapping


# ---------------------------------------------------------------------------
# API: reduction-removal-breakdown
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reduction_removal_empty(client):
    resp = await client.get("/api/v1/charts/reduction-removal-breakdown")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_reduction_removal_with_data(client, db):
    db.add(Project(project_id="VCS-1", registry="verra", issued=100, retired=50, reduction_removal="reduction"))
    db.add(Project(project_id="VCS-2", registry="verra", issued=200, retired=30, reduction_removal="reduction"))
    db.add(Project(project_id="VCS-3", registry="verra", issued=500, retired=100, reduction_removal="impermanent_removal"))
    db.add(Project(project_id="VCS-4", registry="verra", issued=50, retired=0, reduction_removal=None))
    await db.commit()

    resp = await client.get("/api/v1/charts/reduction-removal-breakdown")
    data = resp.json()
    assert len(data) == 2  # null excluded

    reduction = next(d for d in data if d["reduction_removal"] == "reduction")
    assert reduction["count"] == 2
    assert reduction["issued"] == 300
    assert reduction["retired"] == 80

    removal = next(d for d in data if d["reduction_removal"] == "impermanent_removal")
    assert removal["count"] == 1


# ---------------------------------------------------------------------------
# API: reduction_removal filter on /projects
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_projects_filter_by_reduction_removal(client, db):
    db.add(Project(project_id="VCS-1", name="R1", registry="verra", reduction_removal="reduction"))
    db.add(Project(project_id="VCS-2", name="R2", registry="verra", reduction_removal="impermanent_removal"))
    db.add(Project(project_id="VCS-3", name="R3", registry="verra", reduction_removal="reduction"))
    await db.commit()

    resp = await client.get("/api/v1/projects?reduction_removal=reduction")
    data = resp.json()
    assert data["total"] == 2
    assert all(p["reduction_removal"] == "reduction" for p in data["items"])

    resp2 = await client.get("/api/v1/projects?reduction_removal=impermanent_removal")
    data2 = resp2.json()
    assert data2["total"] == 1
