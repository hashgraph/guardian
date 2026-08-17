# Create a New Rule from the File

**`POST /api/v1/schema-rules/{policyId}/import/file`**

Imports new schema rules from a ZIP file into the local database under the specified policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | Policy identifier (MongoDB ObjectId) to import rules into |

### Request Body

A binary ZIP file containing the schema rule configuration to be imported.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *(binary body)* | zip | Yes | ZIP file containing the exported schema rule |

---

## Response

### Success Response

**Status:** `201 Created`

```json
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
  "status": "DRAFT",
  "config": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | ZIP file is missing or corrupt |
| `500 Internal Server Error` | Unexpected server failure |
