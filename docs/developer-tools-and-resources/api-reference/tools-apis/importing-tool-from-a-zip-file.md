# Importing Tool from a Zip File (with Metadata)

**`POST /api/v1/tools/import/file-metadata`**

Imports a new tool and all associated artifacts from a multipart zip file upload, with an optional metadata file.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOL_MIGRATION_CREATE`

---

## Request

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | Yes | ZIP file containing the tool configuration |
| `metadata` | binary | No | JSON metadata file for the tool migration |

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
| `500 Internal Server Error` | Unexpected server failure or missing tool file in form data |
