# Deletes Role

**`DELETE /api/v1/permissions/roles/{id}`**

Deletes the role with the provided role ID. Users assigned this role will lose the associated permissions.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_DELETE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Role identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
true
```

Returns `true` when the role was deleted successfully.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Role does not exist |
| `422 Unprocessable Entity` | Invalid or missing role ID |
| `500 Internal Server Error` | Unexpected server failure |
