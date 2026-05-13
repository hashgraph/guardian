# Search Projects

**`POST /projects/search`**

Search projects by category or policy filters.

---

## Request

### Request Body

```json
{
  "categoryIds": ["f3b2a9c1e4d5678901234567"],
  "policyIds": ["f3b2a9c1e4d5678901234567"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `categoryIds` | String[] | No | Filter by category IDs |
| `policyIds` | String[] | No | Filter by policy IDs |

Pass an empty object `{}` to return all projects without filtering.

---

## Response

### Success Response

**Status:** `202 Accepted`

Returns an array of project objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "policyId": "f3b2a9c1e4d5678901234567",
    "policyName": "string",
    "registered": "string",
    "title": "string",
    "companyName": "string",
    "sectoralScope": "string"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `500 Internal Server Error` | Unexpected server failure |
