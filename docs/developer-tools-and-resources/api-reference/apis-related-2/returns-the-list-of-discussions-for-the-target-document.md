# Returns the List of Discussions for the Target Document

**`GET /api/v1/policy-comments/{policyId}/{documentId}/discussions`**

Returns the list of discussion threads for the target document.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE`, `Permissions.POLICIES_POLICY_MANAGE`, or `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| `policyId`   | string | Yes      | Policy identifier   |
| `documentId` | string | Yes      | Document identifier |

### Query Parameters

| Parameter  | Type    | Required | Default | Description                                                      |
|------------|---------|----------|---------|------------------------------------------------------------------|
| `search`   | string  | No       | —       | Filter discussions by text search                                |
| `field`    | string  | No       | —       | Filter discussions by field path                                 |
| `readonly` | boolean | No       | false   | When `true` and the caller has audit permission, enables audit mode |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "title": "Please review facility capacity value",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "createDate": "2026-03-30T10:00:00.000Z",
    "commentCount": 3
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
