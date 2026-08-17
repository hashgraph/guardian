# Syncing Retire Pools

**`POST /api/v1/contracts/retire/{contractId}/pools/sync`**

Synchronises the retire pools for the specified contract with on-chain data. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_POOL_UPDATE`

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
"2024-01-15T10:30:00.000Z"
```

The response is an ISO 8601 date string representing the time the sync was completed.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
