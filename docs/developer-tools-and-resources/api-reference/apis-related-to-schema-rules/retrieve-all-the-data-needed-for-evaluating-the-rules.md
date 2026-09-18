# Retrieve All the Data Needed for Evaluating the Rules

**`POST /api/v1/schema-rules/data`**

Returns the schema rules and associated document data required to evaluate rule conditions for a given document.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_EXECUTE` *(returns `null` if the user lacks this permission)*

---

## Request

### Request Body

```json
{
  "policyId": "63e3e5e8a01b3c001234abcd",
  "schemaId": "63e3e5e8a01b3c001234abce",
  "documentId": "63e3e5e8a01b3c001234abcf",
  "parentId": "63e3e5e8a01b3c001234abd0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyId` | string | No | Policy context for rule lookup |
| `schemaId` | string | No | Schema ID to find applicable rules |
| `documentId` | string | No | ID of the document to evaluate |
| `parentId` | string | No | ID of the parent document, if applicable |

---

## Response

### Success Response

**Status:** `201 Created`

```json
[
  {
    "rules": {
      "id": "63e3e5e8a01b3c001234abcd",
      "name": "MRV Data Quality Rules",
      "status": "ACTIVE",
      "config": {}
    },
    "document": {
      "id": "63e3e5e8a01b3c001234abcf",
      "type": "VerifiableCredential"
    },
    "relationships": [
      {
        "id": "63e3e5e8a01b3c001234abd0",
        "type": "VerifiableCredential"
      }
    ]
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `422 Unprocessable Entity` | Request body is empty or malformed |
| `500 Internal Server Error` | Unexpected server failure |
