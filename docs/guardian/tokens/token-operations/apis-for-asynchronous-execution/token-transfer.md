# Token Transfer

**`POST /api/v1/tokens/push/{tokenId}/transfer`**

Asynchronously transfers tokens to a target account. Returns a task ID that can be polled for completion. Provide `amount` for fungible tokens or `serialNumbers` for NFTs. Only users with the Installer (User) role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_EXECUTE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The internal database ID of the token to transfer |

### Request Body

```json
{
  "targetAccount": "0.0.12345",
  "amount": 10,
  "memo": "Optional memo"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetAccount` | string | Yes | Hedera account ID to receive the tokens |
| `amount` | number | Conditional | Fungible token amount; required if `serialNumbers` is absent; must be > 0 |
| `serialNumbers` | number[] | Conditional | NFT serial numbers to transfer; required if `amount` is absent; each must be a positive integer |
| `memo` | string | No | Optional transaction memo |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "6317b09f26182f5d14d7a8a0",
  "expectation": 1
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | User is not registered, or body validation failed (missing `targetAccount`, or neither `amount` nor `serialNumbers` provided) |
| `500 Internal Server Error` | Unexpected server failure |
