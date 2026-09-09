# Token Listing

**`GET /tokens/`**

Returns a list of all tokens. For the Standard Registry role it returns only the token list; for other users it also returns token balances and KYC, Freeze, and Association statuses.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |
| `policyId` | string | No | — | Filter tokens by policy ID |
| `status` | string | No | — | Filter by association status: `Associated` or `All` |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of matching records.

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
    "enableAdmin": true,
    "changeSupply": true,
    "enableFreeze": true,
    "enableKYC": true,
    "enableWipe": true,
    "policies": ["Example Policy (1.0.0)"],
    "policyIds": ["63e3e5e8a01b3c001234abce"],
    "associated": true,
    "balance": "100",
    "frozen": false,
    "kyc": true
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
