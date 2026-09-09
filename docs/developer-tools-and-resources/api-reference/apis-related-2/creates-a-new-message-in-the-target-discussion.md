# Creates a New Message in the Target Discussion

**`POST /api/v1/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments`**

Creates a new message in the target discussion thread.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE` or `Permissions.POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter      | Type   | Required | Description             |
|----------------|--------|----------|-------------------------|
| `policyId`     | string | Yes      | Policy identifier       |
| `documentId`   | string | Yes      | Document identifier     |
| `discussionId` | string | Yes      | Discussion identifier   |

### Request Body

```json
{
  "message": "The capacity figure should be 50 MWh — the extra zero appears to be a typo.",
  "mentionedUsers": [
    "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
  ]
}
```

| Field            | Type     | Required | Description                           |
|------------------|----------|----------|---------------------------------------|
| `message`        | string   | Yes      | Comment text content                  |
| `mentionedUsers` | string[] | No       | Array of user DIDs to mention/notify  |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "message": "The capacity figure should be 50 MWh — the extra zero appears to be a typo.",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "createDate": "2026-03-30T10:05:00.000Z"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Validation error — invalid field values |
| `500 Internal Server Error` | Unexpected server failure |
| `503 Service Unavailable` | Policy block unavailable |
