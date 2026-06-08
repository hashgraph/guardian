# User Info for Selected Token

**`GET /tokens/{tokenId}/{username}/info`**

Returns the token status information for the specified user on the given Hedera token. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The Hedera token ID (e.g. `0.0.5000001`) |
| `username` | string | Yes | The username of the target user |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "tokenId": "0.0.5000001",
  "associated": true,
  "balance": "100",
  "frozen": false,
  "kyc": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Internal database ID |
| `tokenId` | string | Hedera token ID |
| `associated` | boolean | Whether the user is associated with the token |
| `balance` | string | User's token balance |
| `frozen` | boolean | Whether the user's token transfers are frozen |
| `kyc` | boolean | Whether the user has passed KYC |

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid token or username |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
