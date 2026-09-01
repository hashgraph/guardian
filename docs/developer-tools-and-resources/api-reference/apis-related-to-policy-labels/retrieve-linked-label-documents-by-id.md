# Retrieve Linked Label Documents by ID

**`GET /api/v1/policy-labels/{definitionId}/documents/{documentId}/relationships`**

Retrieves the relationship graph for a label document, including all linked documents and their dependencies.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |
| `documentId` | string | Yes | Label document identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "document": {
    "id": "63e3e5e8a01b3c001234abcd",
    "definitionId": "63e3e5e8a01b3c001234abce",
    "status": "NEW"
  },
  "relationships": [
    {
      "id": "63e3e5e8a01b3c001234abcf",
      "type": "VerifiableCredential",
      "document": {}
    }
  ]
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `definitionId` or `documentId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
