# Returns the List of Documents in the Target Policy

**`GET /api/v1/policy-repository/{policyId}/documents`**

Returns the paginated list of documents in the target policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description       |
|------------|--------|----------|-------------------|
| `policyId` | string | Yes      | Policy identifier |

### Query Parameters

| Parameter   | Type    | Required | Default | Description                                                       |
|-------------|---------|----------|---------|-------------------------------------------------------------------|
| `pageIndex` | number  | No       | 0       | Zero-based page index                                             |
| `pageSize`  | number  | No       | 20      | Number of items to return per page                               |
| `type`      | string  | No       | —       | Filter by document type (e.g. `VC`)                              |
| `owner`     | string  | No       | —       | Filter by document owner DID                                      |
| `schema`    | string  | No       | —       | Filter by document schema UUID                                    |
| `comments`  | boolean | No       | —       | When `true`, includes associated discussion comments in the response |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of matching documents.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "type": "VC",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "schema": "#facility-schema",
    "createDate": "2026-03-30T10:00:00.000Z"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid `policyId` value |
| `500 Internal Server Error` | Unexpected server failure |
