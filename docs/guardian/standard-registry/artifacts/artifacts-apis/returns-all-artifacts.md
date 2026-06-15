# Returns all Artifacts

**`GET /artifacts`**

Returns all artifacts.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.ARTIFACTS_FILE_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | No | Artifact identifier |
| `type` | String | No | Filter by owner type: `tool` or `policy` |
| `policyId` | String | No | Filter by policy identifier |
| `toolId` | String | No | Filter by tool identifier |
| `pageIndex` | Integer | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | Integer | No | The number of items to return |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of artifact objects. The total item count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1-e4d5-6789-0123-456789abcdef",
    "name": "country_emission_factors",
    "type": "JSON",
    "extention": "json",
    "owner": "did:hedera:testnet:...",
    "policyId": "f3b2a9c1e4d5678901234567",
    "category": "policy",
    "creator": "did:hedera:testnet:...",
    "createDate": "2024-01-01T00:00:00.000Z",
    "updateDate": "2024-01-01T00:00:00.000Z"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
