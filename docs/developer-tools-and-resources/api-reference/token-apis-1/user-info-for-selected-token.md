# User Info for Selected Token

**`GET /api/v1/tokens/{tokenId}/{username}/info`**

Returns token status information for a specific user on the given token, including KYC, freeze, and association status. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The internal database ID of the token |
| `username` | string | Yes | The username of the user to retrieve token info for |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "tokenId": "0.0.5000001",
  "associated": true,
  "balance": "50",
  "hBarBalance": "10",
  "frozen": false,
  "kyc": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tokenId` | string | Hedera token ID |
| `associated` | boolean | Whether the user is associated with the token |
| `balance` | string | User's token balance |
| `hBarBalance` | string | User's HBAR balance |
| `frozen` | boolean | Whether the user's token transfers are frozen |
| `kyc` | boolean | Whether the user has passed KYC for this token |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | User or token does not exist |
| `422 Unprocessable Entity` | User is not registered |
| `500 Internal Server Error` | Unexpected server failure |
