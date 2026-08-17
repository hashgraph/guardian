# Returns Tool and Its Artifacts in Zip Format

**`GET /api/v1/tools/{id}/export/file`**

Returns a zip file containing the published tool and all associated artifacts such as schemas and VCs.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Tool ID (MongoDB ObjectId) |

---

## Response

### Success Response

**Status:** `200 OK`

Returns a binary ZIP file.

**Response Headers:**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/zip` |
| `Content-Disposition` | `attachment; filename=tool_<timestamp>` |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `id` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
