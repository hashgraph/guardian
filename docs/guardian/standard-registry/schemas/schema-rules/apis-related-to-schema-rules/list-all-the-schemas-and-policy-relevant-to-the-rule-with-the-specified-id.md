# List All Schemas and Policies Relevant to the Rule with the Specified ID

**`GET /api/v1/schema-rules/{ruleId}/relationships`**

Retrieves the policy and all schemas linked to the specified schema rule.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ruleId` | string | Yes | Schema rule identifier (MongoDB ObjectId) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "policy": {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Carbon Credit Policy",
    "version": "1.0.0",
    "status": "PUBLISH"
  },
  "schemas": [
    {
      "id": "63e3e5e8a01b3c001234abce",
      "name": "MRV Schema",
      "version": "1.0.0",
      "status": "PUBLISHED"
    }
  ]
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `ruleId` parameter is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
