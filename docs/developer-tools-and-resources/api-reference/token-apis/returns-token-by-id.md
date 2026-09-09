# Return Token by ID

**`GET /tokens/{tokenId}`**

Returns a single token by its ID, with associated policy information.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOKENS_TOKEN_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenId` | string | Yes | The Hedera token ID (e.g. `0.0.5000001`) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | No | Filter by policy ID |

---

## Response

### Success Response

**Status:** `200 OK`

```json
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
  "policyIds": ["63e3e5e8a01b3c001234abce"]
}
```

Returns `null` if no token is found with the given ID.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
