# Returns Statistic Definition by ID

**`GET /api/v1/policy-statistics/{definitionId}`**

Retrieves the statistic definition for the specified identifier.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Statistic definition identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Carbon Credit Issuance Statistics",
  "description": "Tracks issuance metrics for carbon credit policies",
  "status": "PUBLISHED",
  "policyId": "63e3e5e8a01b3c001234aaaa",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "createDate": "2026-01-15T10:00:00.000Z",
  "updateDate": "2026-01-15T12:00:00.000Z"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid or missing `definitionId` |
| `500 Internal Server Error` | Unexpected server failure |
