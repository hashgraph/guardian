# Returns Statistic Assessment by ID

**`GET /api/v1/policy-statistics/{definitionId}/assessment/{assessmentId}`**

Retrieves the statistic assessment for the specified definition and assessment identifiers.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Statistic definition identifier |
| `assessmentId` | string | Yes | Statistic assessment identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "definitionId": "63e3e5e8a01b3c001234aaaa",
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
| `422 Unprocessable Entity` | Invalid or missing `definitionId` or `assessmentId` |
| `500 Internal Server Error` | Unexpected server failure |
