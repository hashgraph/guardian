# Import Tool from IPFS

**`POST /api/v1/tools/import/message`**

Imports a new tool and all associated artifacts from IPFS into the local database using a Hedera message ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_CREATE`

---

## Request

### Request Body

```json
{
  "messageId": "1700000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | Hedera message ID referencing the tool on IPFS |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Imported Tool",
  "description": "Tool imported from IPFS",
  "status": "PUBLISHED",
  "creator": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "topicId": "0.0.5000001",
  "messageId": "1700000000.000000001"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `messageId` is missing from the request body |
| `500 Internal Server Error` | Unexpected server failure |
