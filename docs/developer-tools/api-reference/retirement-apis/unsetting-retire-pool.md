# Unsetting Retire Pool

**`DELETE /api/v1/contracts/retire/pools/{poolId}`**

Removes a specific retire pool by its ID. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_POOL_DELETE`

---

## Request

### Path Parameters

| Parameter | Type   | Required | Description      |
|-----------|--------|----------|------------------|
| `poolId`  | string | Yes      | Pool identifier  |

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
