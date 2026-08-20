# Delete the Rule by Its ID

**`DELETE /api/v1/schema-rules/{ruleId}`**

Deletes the schema rule with the specified ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_CREATE`

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
true
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `ruleId` parameter is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
