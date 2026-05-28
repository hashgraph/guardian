# Deleting Tag

**`DELETE /api/v1/tags/{uuid}`**

Deletes the tag with the specified UUID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TAGS_TAG_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | Unique identifier (UUID) of the tag to delete |

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
| `422 Unprocessable Entity` | Invalid or missing `uuid` parameter |
| `500 Internal Server Error` | Unexpected server failure |
