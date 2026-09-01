# Returns Token Serials

**`GET /api/v1/tokens/{tokenId}/serials`**

Returns the serial numbers of non-fungible token instances owned by the current user for the specified token.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The internal database ID of the token |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[1, 2, 5, 12]
```

An array of serial numbers (integers) for the non-fungible token instances held by the current user.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | User or token does not exist |
| `500 Internal Server Error` | Unexpected server failure |
