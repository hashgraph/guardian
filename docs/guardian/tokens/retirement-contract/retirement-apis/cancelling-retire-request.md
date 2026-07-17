# Cancelling Retire Request

**`DELETE /api/v1/contracts/retire/requests/{requestId}/cancel`**

Cancels a retire contract request. Accessible by Standard Registry and User roles.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_RETIRE_REQUEST_CREATE`

---

## Request

### Path Parameters

| Parameter   | Type   | Required | Description        |
|-------------|--------|----------|--------------------|
| `requestId` | string | Yes      | Request identifier |

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
