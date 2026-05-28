# Retrieve a Label Definition Configuration by ID

**`GET /api/v1/policy-labels/{definitionId}`**

Retrieves the policy label definition for the specified ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |

---

## Response

### Success Response

**Status:** `200 OK`

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
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Label definition with the specified ID does not exist |
| `422 Unprocessable Entity` | `definitionId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
