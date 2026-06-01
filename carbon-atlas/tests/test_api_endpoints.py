"""
Integration tests for all API endpoints.

Tests verify correct HTTP responses, pagination, filtering, search,
and data integrity — the same checks a QA and carbon market business
person would perform.
"""

import pytest


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_projects_empty(client):
    resp = await client.get("/api/v1/projects")
    data = resp.json()
    assert resp.status_code == 200
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_projects_with_data(client, sample_project):
    resp = await client.get("/api/v1/projects")
    data = resp.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["project_id"] == "VCS-1234"
    assert item["name"] == "Improved Cookstoves Kenya"
    assert item["registry"] == "verra"
    assert item["status"] == "registered"
    assert item["country"] == "Kenya"
    assert item["category"] == "energy-efficiency"
    assert item["issued"] == 50000
    assert item["retired"] == 12000


@pytest.mark.asyncio
async def test_filter_projects_by_registry(client, sample_project):
    resp = await client.get("/api/v1/projects?registry=verra")
    assert resp.json()["total"] == 1
    resp = await client.get("/api/v1/projects?registry=gold-standard")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_filter_projects_by_status(client, sample_project):
    resp = await client.get("/api/v1/projects?status=registered")
    assert resp.json()["total"] == 1
    resp = await client.get("/api/v1/projects?status=completed")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_filter_projects_by_category(client, sample_project):
    resp = await client.get("/api/v1/projects?category=energy-efficiency")
    assert resp.json()["total"] == 1
    resp = await client.get("/api/v1/projects?category=forest-and-land-use")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_filter_projects_by_country(client, sample_project):
    resp = await client.get("/api/v1/projects?country=Kenya")
    assert resp.json()["total"] == 1
    resp = await client.get("/api/v1/projects?country=Brazil")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_search_projects_by_name(client, sample_project):
    resp = await client.get("/api/v1/projects?search=cookstove")
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_search_projects_by_id(client, sample_project):
    resp = await client.get("/api/v1/projects?search=VCS-1234")
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_search_projects_case_insensitive(client, sample_project):
    resp = await client.get("/api/v1/projects?search=COOKSTOVE")
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_search_no_match(client, sample_project):
    resp = await client.get("/api/v1/projects?search=nonexistent")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_projects_pagination(client, sample_project):
    resp = await client.get("/api/v1/projects?page=1&page_size=1")
    data = resp.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["page_size"] == 1
    assert data["total_pages"] == 1
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_projects_pagination_beyond_range(client, sample_project):
    resp = await client.get("/api/v1/projects?page=99")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_project_detail(client, sample_project):
    resp = await client.get("/api/v1/projects/VCS-1234")
    assert resp.status_code == 200
    data = resp.json()
    assert data["project_id"] == "VCS-1234"
    assert data["description"] == "Improved cookstoves project in rural Kenya"
    assert data["sdg_goals"] == [7, 13]
    assert data["estimated_annual_reductions"] == 25000
    assert data["developers"] == []


@pytest.mark.asyncio
async def test_get_project_detail_with_developers(client, sample_project, sample_developer):
    resp = await client.get("/api/v1/projects/VCS-1234")
    data = resp.json()
    assert len(data["developers"]) == 1
    assert data["developers"][0]["name"] == "Test Developer Ltd."


@pytest.mark.asyncio
async def test_get_project_not_found(client):
    resp = await client.get("/api/v1/projects/NONEXISTENT")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_combined_filters(client, sample_project):
    """Multiple filters applied simultaneously — a realistic user scenario."""
    resp = await client.get(
        "/api/v1/projects?registry=verra&status=registered&category=energy-efficiency&country=Kenya"
    )
    assert resp.json()["total"] == 1


# ---------------------------------------------------------------------------
# Credits
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_credits_empty(client):
    resp = await client.get("/api/v1/credits")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_credits_with_data(client, sample_credits):
    resp = await client.get("/api/v1/credits")
    data = resp.json()
    assert data["total"] == 3
    # Should have issuances and retirements
    types = {c["transaction_type"] for c in data["items"]}
    assert "issuance" in types
    assert "retirement" in types


@pytest.mark.asyncio
async def test_filter_credits_by_project(client, sample_credits):
    resp = await client.get("/api/v1/credits?project_id=VCS-1234")
    assert resp.json()["total"] == 3


@pytest.mark.asyncio
async def test_filter_credits_by_type(client, sample_credits):
    resp = await client.get("/api/v1/credits?transaction_type=issuance")
    assert resp.json()["total"] == 2
    resp = await client.get("/api/v1/credits?transaction_type=retirement")
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_filter_credits_by_vintage(client, sample_credits):
    resp = await client.get("/api/v1/credits?vintage_min=2024&vintage_max=2024")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["vintage"] == 2024


@pytest.mark.asyncio
async def test_retirement_beneficiary_in_response(client, sample_credits):
    """Carbon buyers need to see who retired credits — essential business data."""
    resp = await client.get("/api/v1/credits?transaction_type=retirement")
    item = resp.json()["items"][0]
    assert item["retirement_beneficiary"] == "Acme Corp"


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stats_empty(client):
    resp = await client.get("/api/v1/stats")
    data = resp.json()
    assert data["total_projects"] == 0
    assert data["total_issued"] == 0
    assert data["retirement_rate"] == 0.0


@pytest.mark.asyncio
async def test_stats_with_data(client, sample_project):
    resp = await client.get("/api/v1/stats")
    data = resp.json()
    assert data["total_projects"] == 1
    assert data["total_issued"] == 50000
    assert data["total_retired"] == 12000
    assert data["retirement_rate"] == 24.0  # 12000/50000 * 100
    assert data["num_countries"] == 1
    assert "verra" in data["by_registry"]
    assert "energy-efficiency" in data["by_category"]


@pytest.mark.asyncio
async def test_stats_filtered_by_registry(client, sample_project):
    resp = await client.get("/api/v1/stats?registry=gold-standard")
    assert resp.json()["total_projects"] == 0


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_issuances_by_vintage(client, sample_credits):
    resp = await client.get("/api/v1/charts/issuances-by-vintage")
    data = resp.json()
    assert len(data) == 2  # vintages 2023 and 2024
    v2023 = next(d for d in data if d["vintage"] == 2023)
    assert v2023["issued"] == 30000
    assert v2023["retired"] == 12000


@pytest.mark.asyncio
async def test_credits_over_time(client, sample_credits):
    resp = await client.get("/api/v1/charts/credits-over-time")
    data = resp.json()
    assert len(data) >= 1
    # Should have months in YYYY-MM format
    assert all(len(d["date"]) == 7 for d in data)


@pytest.mark.asyncio
async def test_projects_by_country(client, sample_project):
    resp = await client.get("/api/v1/charts/projects-by-country")
    data = resp.json()
    assert len(data) == 1
    assert data[0]["country"] == "Kenya"
    assert data[0]["count"] == 1


@pytest.mark.asyncio
async def test_projects_by_category(client, sample_project):
    resp = await client.get("/api/v1/charts/projects-by-category")
    data = resp.json()
    assert len(data) == 1
    assert data[0]["category"] == "energy-efficiency"


@pytest.mark.asyncio
async def test_status_breakdown(client, sample_project):
    resp = await client.get("/api/v1/charts/status-breakdown")
    data = resp.json()
    assert len(data) == 1
    assert data[0]["registry"] == "verra"
    assert data[0]["status"] == "registered"
    assert data[0]["count"] == 1


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_events_empty(client):
    resp = await client.get("/api/v1/events")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_events_with_data(client, sample_event):
    resp = await client.get("/api/v1/events")
    data = resp.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["event_type"] == "new_project"
    assert item["project_id"] == "VCS-1234"
    assert item["new_value"]["name"] == "Improved Cookstoves Kenya"


@pytest.mark.asyncio
async def test_filter_events_by_type(client, sample_event):
    resp = await client.get("/api/v1/events?event_type=new_project")
    assert resp.json()["total"] == 1
    resp = await client.get("/api/v1/events?event_type=status_change")
    assert resp.json()["total"] == 0


# ---------------------------------------------------------------------------
# Developers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_developers_empty(client):
    resp = await client.get("/api/v1/developers")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_developers_with_data(client, sample_developer):
    resp = await client.get("/api/v1/developers")
    data = resp.json()
    assert data["total"] == 1
    dev = data["items"][0]
    assert dev["name"] == "Test Developer Ltd."
    assert dev["project_count"] == 1
    assert dev["total_issued"] == 50000
    assert "Kenya" in dev["countries"]


@pytest.mark.asyncio
async def test_search_developers(client, sample_developer):
    resp = await client.get("/api/v1/developers?search=Test")
    assert resp.json()["total"] == 1
    resp = await client.get("/api/v1/developers?search=nonexistent")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_get_developer_detail(client, sample_developer):
    resp = await client.get("/api/v1/developers/test-developer-ltd")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Developer Ltd."
    assert data["registries"] == ["verra"]
    assert data["methodologies"] == ["VM0065"]


@pytest.mark.asyncio
async def test_get_developer_not_found(client):
    resp = await client.get("/api/v1/developers/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_developer_projects(client, sample_developer):
    resp = await client.get("/api/v1/developers/test-developer-ltd/projects")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["project_id"] == "VCS-1234"
