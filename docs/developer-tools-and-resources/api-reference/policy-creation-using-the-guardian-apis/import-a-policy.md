# Import a Policy from IPFS

**`POST /policies/import/message`**

Imports a new policy and all associated artifacts from IPFS into the local database using the Hedera message ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `versionOfTopicId` | string | No | — | The topic ID of the policy version to associate |
| `demo` | boolean | No | false | Import the policy in demo mode |
| `originalTracking` | boolean | No | false | Save the original state of the policy |

### Request Body

```json
{
  "messageId": "1680000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | The Hedera message ID that contains the IPFS CID of the policy |

---

## Response

### Success Response

**Status:** `201 Created`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "iREC Policy",
    "version": "1.0.0",
    "status": "DRAFT",
    "topicId": "0.0.4532001"
  }
]
```

Returns the full list of policies after import.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Message ID is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
