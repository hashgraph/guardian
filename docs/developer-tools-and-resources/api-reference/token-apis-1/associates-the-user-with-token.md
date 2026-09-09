# Associates the User with Token

**`PUT /api/v1/tokens/{tokenId}/associate`**

Associates the calling user with the specified Hedera token. Only users with the Installer (User) role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_EXECUTE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The internal database ID of the token to associate |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "tokenId": "0.0.5000001",
  "associated": true,
  "balance": "0",
  "hBarBalance": "10",
  "frozen": false,
  "kyc": false
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
