# Comparing VP Documents

**`POST /api/v1/projects/compare/documents`**

Compares two or more VC documents across projects and returns both VC-level and VP-level comparison results. This endpoint does not require authentication.

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

| Field         | Type   | Required | Description                                                                   |
|---------------|--------|----------|-------------------------------------------------------------------------------|
| `documentId1` | string | No*      | ID of the first document. Required if `documentIds` is absent                 |
| `documentId2` | string | No*      | ID of the second document. Required if `documentIds` is absent                |
| `documentIds` | array  | No*      | Array of document IDs to compare. Required if `documentId1`/`documentId2` are absent |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "projects": {
    "documents": {},
    "left": {},
    "right": {},
    "total": {}
  },
  "presentations": {
    "documents": {},
    "left": {},
    "right": {},
    "total": {}
  }
}
```

| Field           | Type   | Description                                          |
|-----------------|--------|------------------------------------------------------|
| `projects`      | object | VC document comparison result                        |
| `presentations` | object | VP (Verifiable Presentation) comparison result       |

### Error Responses

| Status | Description |
|--------|-------------|
| `422 Unprocessable Entity` | Neither document pair nor documentIds array provided |
| `500 Internal Server Error` | Unexpected server failure |
