# Retrieve the List of Created Tokens (VPs) for Which a Label Document Can Be Created

**`GET /api/v1/policy-labels/{definitionId}/tokens`**

Returns a paginated list of VP (Verifiable Presentation) documents associated with the label definition for which label documents can be created.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Number of items to return per page |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of VC document objects. The total count is provided in the `X-Total-Count` response header.

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

| Header | Description |
|--------|-------------|
| `X-Total-Count` | Total number of VP documents matching the query |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `definitionId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
