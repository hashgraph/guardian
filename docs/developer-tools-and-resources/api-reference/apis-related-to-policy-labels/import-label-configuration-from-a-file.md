# Import Label Configuration from a File

**`POST /api/v1/policy-labels/{policyId}/import/file`**

Imports new policy label definitions from a zip file into the local database.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | Policy identifier to associate the imported labels with |

### Request Body

Binary zip file containing the label definitions to import.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *(binary)* | file | Yes | A `.zip` file exported from a Guardian instance |

> Set `Content-Type: application/zip` when uploading the file.

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Carbon Credit Label",
  "description": "Certification label for verified carbon credits",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "status": "DRAFT",
  "config": {},
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Malformed or unreadable zip file |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `policyId` is missing or the file content is invalid |
| `500 Internal Server Error` | Unexpected server failure |
