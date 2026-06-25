# Retrieve Token (VP) and All Its Dependencies by Document ID

**`GET /api/v1/policy-labels/{definitionId}/tokens/{documentId}`**

Returns the VP document and all its related dependency documents for a given label definition and document ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |
| `documentId` | string | Yes | VP document identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "type": "VerifiableCredential",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "schema": "63e3e5e8a01b3c001234abce",
    "document": {}
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `definitionId` or `documentId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
