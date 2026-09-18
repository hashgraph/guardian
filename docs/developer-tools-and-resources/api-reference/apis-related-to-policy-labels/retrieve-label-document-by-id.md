# Retrieve Label Document by ID

**`GET /api/v1/policy-labels/{definitionId}/documents/{documentId}`**

Retrieves a specific label document by its ID within the specified label definition.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |
| `documentId` | string | Yes | Label document identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "definitionId": "63e3e5e8a01b3c001234abce",
  "tokenId": "63e3e5e8a01b3c001234abcf",
  "status": "NEW",
  "document": {},
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Label document with the specified ID does not exist |
| `422 Unprocessable Entity` | `definitionId` or `documentId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
