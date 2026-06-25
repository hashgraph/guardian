# Search Projects by Filters

**`POST /api/v1/projects/search`**

Searches for projects matching the provided category or policy filters. This endpoint does not require authentication.

---

## Request

### Request Body

```json
{
  "categoryIds": ["63e3e5e8a01b3c001234abcd"],
  "policyIds": ["63e3e5e8a01b3c001234abce"]
}
```

| Field         | Type   | Required | Description                                                                    |
|---------------|--------|----------|--------------------------------------------------------------------------------|
| `categoryIds` | array  | No       | List of category IDs to filter projects by                                     |
| `policyIds`   | array  | No       | List of policy IDs to filter projects by                                       |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "policyId": "63e3e5e8a01b3c001234abce",
    "policyName": "Example Policy",
    "registered": "2024-01-15T00:00:00.000Z",
    "title": "Example Project",
    "companyName": "Example Corp",
    "sectoralScope": "Energy"
  }
]
```

| Field           | Type   | Description                                  |
|-----------------|--------|----------------------------------------------|
| `id`            | string | Unique identifier of the project             |
| `policyId`      | string | ID of the policy this project belongs to     |
| `policyName`    | string | Name of the associated policy                |
| `registered`    | string | Registration date of the project (ISO 8601)  |
| `title`         | string | Project title                                |
| `companyName`   | string | Name of the company that registered the project |
| `sectoralScope` | string | Sectoral scope of the project                |

### Error Responses

| Status | Description |
|--------|-------------|
| `500 Internal Server Error` | Unexpected server failure |
