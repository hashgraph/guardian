# Disassociating User from the Hedera Token (Async)

**`PUT /tokens/push/{tokenId}/dissociate`**

Disassociates the authenticated user from the specified Hedera token asynchronously.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_EXECUTE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The Hedera token ID (e.g. `0.0.5000001`) |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Dissociate token"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | User not registered with Hedera |
| `500 Internal Server Error` | Unexpected server failure |
