# Retrieve the Schema Rules

**`GET /api/v1/schema-rules`**

Returns a paginated list of all schema rules visible to the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Number of items to return per page |
| `policyInstanceTopicId` | string | No | — | Filter results by Hedera policy instance topic ID |

---

## Response

### Success Response

**Status:** `200 OK`

The total number of matching rules is returned in the `X-Total-Count` response header.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "3b4e1c2d-5f6a-7890-abcd-ef1234567890",
    "name": "MRV Data Quality Rules",
    "description": "Validation rules for MRV schema fields",
    "creator": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "policyId": "63e3e5e8a01b3c001234abcd",
    "policyTopicId": "0.0.4532001",
    "policyInstanceTopicId": "0.0.4532002",
    "status": "ACTIVE",
    "config": {}
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
