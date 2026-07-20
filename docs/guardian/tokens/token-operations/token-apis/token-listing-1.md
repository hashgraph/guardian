# Creation of Token

**`POST /api/v1/tokens`**

Creates a new token on the Hedera network. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_CREATE`

---

## Request

### Request Body

```json
{
  "tokenName": "Example Token",
  "tokenSymbol": "EXT",
  "tokenType": "fungible",
  "decimals": "2",
  "initialSupply": "0",
  "changeSupply": true,
  "enableAdmin": true,
  "enableKYC": true,
  "enableFreeze": true,
  "enableWipe": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tokenName` | string | Yes | Human-readable name of the token |
| `tokenSymbol` | string | Yes | Short symbol for the token |
| `tokenType` | string | Yes | Type of token: `fungible` or `non-fungible` |
| `decimals` | string | No | Number of decimal places (fungible tokens only) |
| `initialSupply` | string | No | Initial token supply |
| `changeSupply` | boolean | No | Whether the supply can be changed |
| `enableAdmin` | boolean | No | Whether admin key is enabled |
| `enableKYC` | boolean | No | Whether KYC key is enabled |
| `enableFreeze` | boolean | No | Whether freeze key is enabled |
| `enableWipe` | boolean | No | Whether wipe key is enabled |

---

## Response

### Success Response

**Status:** `201 Created`

```json
[
  {
    "tokenId": "0.0.5000001",
    "tokenName": "Example Token",
    "tokenSymbol": "EXT",
    "tokenType": "fungible",
    "decimals": "2",
    "initialSupply": "0",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
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
| `422 Unprocessable Entity` | User is not registered |
| `500 Internal Server Error` | Unexpected server failure |
