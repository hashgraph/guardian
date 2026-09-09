# Updating a Token

**`PUT /tokens/`**

Updates an existing token's configuration. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_UPDATE`

---

## Request

### Request Body

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "tokenId": "0.0.5000001",
  "tokenName": "Updated Token Name",
  "tokenSymbol": "ET",
  "enableAdmin": true,
  "changeSupply": true,
  "enableFreeze": true,
  "enableKYC": true,
  "enableWipe": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Internal database ID of the token |
| `tokenId` | string | Yes | Hedera token ID |
| `tokenName` | string | No | Updated token name |
| `tokenSymbol` | string | No | Updated token symbol |
| `enableAdmin` | boolean | No | Whether admin key is enabled |
| `changeSupply` | boolean | No | Whether supply can be changed |
| `enableFreeze` | boolean | No | Whether freeze key is enabled |
| `enableKYC` | boolean | No | Whether KYC key is enabled |
| `enableWipe` | boolean | No | Whether wipe key is enabled |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an updated array of all tokens.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "tokenId": "0.0.5000001",
    "tokenName": "Updated Token Name",
    "tokenSymbol": "ET"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
