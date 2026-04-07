# Retrieve the List of Components for Label Configuration (Schemas, Policies, etc.)

**`GET /api/v1/policy-labels/{definitionId}/relationships`**

Retrieves policy label relationships, including referenced schemas, policies, and other components for the specified label definition.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "label": {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Carbon Credit Label"
  },
  "schemas": [],
  "policies": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `definitionId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
