# Creation of a Token

**`POST /tokens/`**

Creates a new Hedera token. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_CREATE`

---

## Request

### Request Body

```json
{
  "tokenName": "Example Token",
  "tokenSymbol": "ET",
  "tokenType": "fungible",
  "decimals": 2,
  "initialSupply": 0,
  "enableAdmin": true,
  "changeSupply": true,
  "enableFreeze": true,
  "enableKYC": true,
  "enableWipe": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tokenName` | string | Yes | Name of the token |
| `tokenSymbol` | string | Yes | Symbol of the token |
| `tokenType` | string | Yes | Token type: `fungible` or `non-fungible` |
| `decimals` | number | No | Number of decimal places (fungible only) |
| `initialSupply` | number | No | Initial supply amount |
| `enableAdmin` | boolean | No | Whether admin key is enabled |
| `changeSupply` | boolean | No | Whether supply can be changed |
| `enableFreeze` | boolean | No | Whether freeze key is enabled |
| `enableKYC` | boolean | No | Whether KYC key is enabled |
| `enableWipe` | boolean | No | Whether wipe key is enabled |

---

## Response

### Success Response

**Status:** `201 Created`

Returns an updated array of all tokens.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "tokenId": "0.0.5000001",
    "tokenName": "Example Token",
    "tokenSymbol": "ET",
    "tokenType": "fungible",
    "decimals": 2,
    "initialSupply": 0,
    "policies": [],
    "policyIds": []
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | User not registered with Hedera |
| `500 Internal Server Error` | Unexpected server failure |
