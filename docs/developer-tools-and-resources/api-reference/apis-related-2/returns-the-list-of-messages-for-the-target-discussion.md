# Returns the List of Messages for the Target Discussion

**`POST /api/v1/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments/search`**

Returns the paginated list of messages for the target discussion.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE`, `Permissions.POLICIES_POLICY_MANAGE`, or `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter      | Type   | Required | Description           |
|----------------|--------|----------|-----------------------|
| `policyId`     | string | Yes      | Policy identifier     |
| `documentId`   | string | Yes      | Document identifier   |
| `discussionId` | string | Yes      | Discussion identifier |

### Query Parameters

| Parameter  | Type    | Required | Default | Description                                                          |
|------------|---------|----------|---------|----------------------------------------------------------------------|
| `readonly` | boolean | No       | false   | When `true` and the caller has audit permission, enables audit mode  |

### Request Body

```json
{
  "pageIndex": 0,
  "pageSize": 25,
  "from": "2026-01-01T00:00:00.000Z"
}
```

| Field       | Type   | Required | Description                                   |
|-------------|--------|----------|-----------------------------------------------|
| `pageIndex` | number | No       | Zero-based page index                         |
| `pageSize`  | number | No       | Number of items per page                      |
| `from`      | string | No       | Filter comments created after this timestamp (ISO 8601) |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of messages.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "message": "The capacity figure should be 50 MWh — the extra zero appears to be a typo.",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "createDate": "2026-03-30T10:05:00.000Z",
    "files": []
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
