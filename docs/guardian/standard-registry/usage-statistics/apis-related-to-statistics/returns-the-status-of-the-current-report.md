# Returns Statistic Definition Relationships

**`GET /api/v1/policy-statistics/{definitionId}/relationships`**

Retrieves the relationship graph for the specified statistic definition, including linked policies, schemas, and documents.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Statistic definition identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Carbon Credit Issuance Statistics",
  "policy": {
    "id": "63e3e5e8a01b3c001234aaaa",
    "name": "Carbon Credit Policy"
  },
  "schemas": [
    {
      "id": "63e3e5e8a01b3c001234bbbb",
      "name": "Emission Reduction Schema"
    }
  ]
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid or missing `definitionId` |
| `500 Internal Server Error` | Unexpected server failure |
