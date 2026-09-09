# Create a New Formula (Import) from a File

**`POST /api/v1/formulas/{policyId}/import/file`**

Imports a new formula from a ZIP file and links it to the specified policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | ID of the policy to associate with the imported formula |

### Request Body

Binary ZIP file containing the formula export.

**Content-Type:** `application/zip`

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "c4a3b2d1-e5f6-7890-abcd-ef1234567890",
  "name": "Carbon Credit Calculator",
  "description": "Calculates carbon credits based on emission factors",
  "status": "DRAFT",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "config": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Malformed or missing ZIP file |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
