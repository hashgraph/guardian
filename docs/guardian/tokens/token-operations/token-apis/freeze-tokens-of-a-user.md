# Freeze Tokens of a User

**`PUT /api/v1/tokens/{tokenId}/{username}/freeze`**

Freezes transfers of the specified token for the given user. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The internal database ID of the token |
| `username` | string | Yes | The username of the user whose token transfers will be frozen |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "tokenId": "0.0.5000001",
  "associated": true,
  "balance": "100",
  "hBarBalance": "10",
  "frozen": true,
  "kyc": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | User or token does not exist |
| `422 Unprocessable Entity` | User is not registered |
| `500 Internal Server Error` | Unexpected server failure |
