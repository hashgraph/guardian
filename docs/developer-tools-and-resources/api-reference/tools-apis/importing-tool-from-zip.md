# Importing Tool from Zip

**`POST /api/v1/tools/import/file`**

Imports a new tool and all associated artifacts such as schemas and VCs from the provided zip file into the local database.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_CREATE`

---

## Request

### Request Body

Send the raw ZIP file bytes as the request body.

**Content-Type:** `application/octet-stream`

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Imported Tool",
  "description": "Tool imported from zip",
  "status": "DRAFT",
  "creator": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "topicId": "0.0.5000001"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
