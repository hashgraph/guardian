# Rejecting Wipe Requests

**`DELETE /api/v1/contracts/wipe/requests/{requestId}/reject`**

Rejects a wipe contract request, optionally banning the requester. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_WIPE_REQUEST_REVIEW`

---

## Request

### Path Parameters

| Parameter   | Type   | Required | Description        |
|-------------|--------|----------|--------------------|
| `requestId` | string | Yes      | Request identifier |

### Query Parameters

| Parameter | Type    | Required | Default | Description                                  |
|-----------|---------|----------|---------|----------------------------------------------|
| `ban`     | boolean | No       | false   | If `true`, also bans the requester's account |

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
