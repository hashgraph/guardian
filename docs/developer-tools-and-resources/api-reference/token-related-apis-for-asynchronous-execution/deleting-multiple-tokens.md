# Deleting Multiple Tokens (Async)

**`POST /tokens/push/delete-multiple`**

Deletes multiple Hedera tokens asynchronously. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_DELETE`

---

## Request

### Request Body

```json
{
  "tokenIds": ["0.0.5000001", "0.0.5000002"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tokenIds` | string[] | Yes | Array of Hedera token IDs to delete |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Delete multiple tokens"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
