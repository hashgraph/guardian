# Compare Documents

**`POST /projects/compare/documents`**

Compares two or more project documents. Accepts either a pair of individual document IDs or an array of document IDs.

---

## Request

### Request Body

Either `documentId1` + `documentId2`, or `documentIds` (array of at least 2 IDs).

```json
{
  "documentId1": "f3b2a9c1e4d5678901234567",
  "documentId2": "a1b2c3d4e5f6789012345678"
}
```

```json
{
  "documentIds": [
    "f3b2a9c1e4d5678901234567",
    "a1b2c3d4e5f6789012345678"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `documentId1` | String | Conditional | First document ID (use with `documentId2`) |
| `documentId2` | String | Conditional | Second document ID (use with `documentId1`) |
| `documentIds` | String[] | Conditional | Array of at least 2 document IDs |

---

## Response

### Success Response

**Status:** `200 OK`

Returns a document comparison result object.

```json
{
  "documents": {},
  "left": {},
  "right": {},
  "total": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `422 Unprocessable Entity` | Neither a valid document pair nor a valid `documentIds` array was provided |
| `500 Internal Server Error` | Unexpected server failure |
