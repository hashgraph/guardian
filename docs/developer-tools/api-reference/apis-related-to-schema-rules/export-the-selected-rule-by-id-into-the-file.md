# Export the Selected Rule by ID into the File

**`GET /api/v1/schema-rules/{ruleId}/export/file`**

Returns a ZIP file containing the exported schema rule configuration for the specified rule ID.

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

Returns a binary ZIP file as the response body.

| Header | Value |
|--------|-------|
| `Content-Type` | `application/zip` |
| `Content-Disposition` | `attachment; filename=theme_<timestamp>` |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
