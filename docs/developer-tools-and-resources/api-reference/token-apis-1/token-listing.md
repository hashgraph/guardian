# Token Listing

**`GET /api/v1/tokens`**

Returns all tokens. For the Standard Registry role it returns only the list of tokens; for other users it also returns token balances as well as the KYC, Freeze, and Association statuses. Not allowed for the Auditor role.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |
| `policyId` | string | No | — | Filter tokens associated with this policy ID |
| `status` | string | No | — | Token status filter: `Associated` or `All` |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "tokenId": "0.0.5000001",
    "tokenName": "Example Token",
    "tokenSymbol": "EXT",
    "tokenType": "fungible",
    "decimals": "2",
    "initialSupply": "0",
    "adminId": "0.0.4532001",
    "changeSupply": true,
    "enableAdmin": true,
    "enableKYC": true,
    "enableFreeze": true,
    "enableWipe": true,
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "policies": ["iREC 3 (1.0.0)"],
    "policyIds": ["63e3e5e8a01b3c001234abcd"]
  }
]
```

The response includes an `X-Total-Count` header with the total number of tokens.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
