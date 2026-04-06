# Returning Log Attributes

**`GET /logs/attributes`**

Returns a list of log source attribute names, optionally filtered by a name substring. For Standard Registry users only.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.LOG_LOG_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Substring to search within attribute names |
| `existingAttributes` | string[] | No | Attributes already selected (excluded from results) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
["API_GATEWAY", "WORKER", "GUARDIAN_SERVICE"]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
