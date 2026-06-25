# Freeze Tokens of a User

**`PUT /tokens/{tokenId}/{username}/freeze`**

Freezes transfers of the specified Hedera token for the given user. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_EXECUTE`

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
  "balance": "0",
  "frozen": true,
  "kyc": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid token or username |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
