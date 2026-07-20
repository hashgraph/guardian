# Token Listing (Api-Version: 2)

**`GET /tokens`** — requires `Api-Version: 2` header

Returns all tokens. For the Standard Registry role it returns only the list of token definitions; for other users it also returns token balances as well as the KYC, Freeze, and Association statuses. Not allowed for the Auditor role.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_READ`

---

## Request

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Api-Version` | `2` | Yes | Enables V2 behaviour |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | The number of pages to skip before starting to collect the result set |
| `pageSize` | number | No | 20 | The number of items to return |
| `policyId` | string | No | — | Filter tokens associated with this policy ID |
| `status` | string | No | — | Token status filter. Allowed values: `Associated`, `All` |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of token objects. The total item count is provided in the `X-Total-Count` response header.

**Standard Registry** — returns token definitions only:

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

**Regular user** — additionally includes balance, KYC, Freeze, and Association statuses:

```json
[
  {
    "tokenId": "0.0.5000001",
    "tokenName": "Example Token",
    "tokenSymbol": "EXT",
    "tokenType": "fungible",
    "decimals": "2",
    "associated": true,
    "balance": "150",
    "hederaAccountId": "0.0.1234567",
    "kyc": "NONE",
    "freeze": "NONE",
    "policies": ["iREC 3 (1.0.0)"],
    "policyIds": ["63e3e5e8a01b3c001234abcd"]
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions or Auditor role |
| `500 Internal Server Error` | Unexpected server failure |
