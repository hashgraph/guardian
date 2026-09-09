# Load the File and Return Its Preview

**`POST /api/v1/schema-rules/import/file/preview`**

Imports a ZIP file containing a schema rule and returns a preview of the rule without saving it to the database.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_CREATE`

---

## Request

### Request Body

A binary ZIP file previously exported from the schema rules export endpoint.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *(binary body)* | zip | Yes | ZIP file containing the exported schema rule |

---

## Response

### Success Response

**Status:** `200 OK`

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
