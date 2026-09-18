# Comparing Documents

**`POST /api/v1/analytics/compare/documents`**

Compares two or more VC documents and returns a detailed field-level comparison result. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.ANALYTIC_DOCUMENT_READ`

---

## Request

### Request Body

```json
{
  "documentId1": "63e3e5e8a01b3c001234abcd",
  "documentId2": "63e3e5e8a01b3c001234abce"
}
```

Alternatively, compare multiple documents at once:

```json
{
  "documentIds": [
    "63e3e5e8a01b3c001234abcd",
    "63e3e5e8a01b3c001234abce"
  ]
}
```

| Field         | Type   | Required | Description                                                              |
|---------------|--------|----------|--------------------------------------------------------------------------|
| `documentId1` | string | No*      | ID of the first document to compare. Required if `documentIds` is absent |
| `documentId2` | string | No*      | ID of the second document to compare. Required if `documentIds` is absent |
| `documentIds` | array  | No*      | Array of document IDs to compare. Required if `documentId1`/`documentId2` are absent |
| `eventsLvl`   | number | No       | Comparison depth for events                                              |
| `propLvl`     | number | No       | Comparison depth for properties                                          |
| `childrenLvl` | number | No       | Comparison depth for children                                            |
| `idLvl`       | number | No       | Comparison depth for IDs                                                 |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "documents": {},
  "left": {},
  "right": {},
  "total": {}
}
```

| Field       | Type   | Description                                 |
|-------------|--------|---------------------------------------------|
| `documents` | object | Document metadata for both sides            |
| `left`      | object | Fields and values from the left document    |
| `right`     | object | Fields and values from the right document   |
| `total`     | object | Summary of differences and matches          |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Neither document pair nor documentIds array provided |
| `500 Internal Server Error` | Unexpected server failure |
