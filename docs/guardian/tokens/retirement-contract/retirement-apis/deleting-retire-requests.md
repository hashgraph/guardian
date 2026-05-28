# Deleting Retire Requests

**`DELETE /api/v1/contracts/retire/{contractId}/requests`**

Clears all retire requests for the specified contract. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_RETIRE_REQUEST_DELETE`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| `contractId` | string | Yes      | Contract identifier |

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
| `500 Internal Server Error` | Unexpected server failure |
