# Create a New Label Document for Token (VP)

**`POST /api/v1/policy-labels/{definitionId}/documents`**

Creates a new label document certifying a VP token document against the specified label definition.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |

### Request Body

```json
{
  "tokenId": "63e3e5e8a01b3c001234abcd",
  "document": {},
  "relationships": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tokenId` | string | Yes | ID of the VP document being labeled |
| `document` | object | Yes | Label document content |
| `relationships` | array | No | Array of related document IDs |

---

## Response

### Success Response

**Status:** `201 Created`

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
| `400 Bad Request` | Malformed request body |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `definitionId` is missing, or document configuration is invalid |
| `500 Internal Server Error` | Unexpected server failure |
