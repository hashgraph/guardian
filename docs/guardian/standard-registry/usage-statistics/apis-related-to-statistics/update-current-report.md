# Updates Statistic Definition

**`PUT /api/v1/policy-statistics/{definitionId}`**

Updates the configuration of the statistic definition with the specified identifier.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Statistic definition identifier |

### Request Body

```json
{
  "name": "Updated Statistics Name",
  "description": "Updated description for the statistic definition",
  "config": {
    "variables": [],
    "scores": []
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Human-readable name for the definition |
| `description` | string | No | Description of the definition |
| `config` | object | No | Definition configuration object |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Updated Statistics Name",
  "description": "Updated description for the statistic definition",
  "status": "DRAFT",
  "policyId": "63e3e5e8a01b3c001234aaaa",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "createDate": "2026-01-15T10:00:00.000Z",
  "updateDate": "2026-04-07T09:00:00.000Z"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Statistic definition does not exist |
| `422 Unprocessable Entity` | Invalid or missing `definitionId` |
| `500 Internal Server Error` | Unexpected server failure |
