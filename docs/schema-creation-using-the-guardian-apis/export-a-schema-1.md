# Export Schema as Zip File

**`GET /api/v1/schemas/{schemaId}/export/file`**

Returns a zip archive containing the schema files for the specified schema. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The internal database ID of the schema to export |

---

## Response

### Success Response

**Status:** `200 OK`

The response body is a binary zip file (`application/zip`). The `Content-Disposition` header is set to `attachment; filename=<timestamp>`.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Schema cannot be exported |
| `500 Internal Server Error` | Unexpected server failure |
