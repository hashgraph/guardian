# Get Contract Permissions

**`GET /api/v1/contracts/{contractId}/permissions`**

Returns the permission flags for the specified smart contract. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_PERMISSIONS_READ`

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
3
```

The response is a numeric bitmask representing the caller's permissions on the contract.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
