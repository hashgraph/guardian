# Export Files from Schema

**`GET /schemas/{schemaId}/export/file`**

Returns schema files for the schemas as a zip archive. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | String | Yes | Selected schema ID |

---

## Response

### Success Response

**Status:** `200 OK`

Returns a binary zip file containing the schema files.

**Content-Type:** `application/zip`

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Validation error |
| `500 Internal Server Error` | Unexpected server failure |
