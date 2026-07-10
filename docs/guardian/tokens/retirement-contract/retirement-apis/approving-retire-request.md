# Approving Retire Request

**`POST /api/v1/contracts/retire/requests/{requestId}/approve`**

Approves a retire contract request. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_RETIRE_REQUEST_REVIEW`

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
