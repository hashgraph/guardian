# Projects APIs

Base URL: `/api/v1/projects`
Authentication: All endpoints require Bearer JWT.

The Projects API provides cross-policy document search and comparison for environmental project portfolios.

---

## POST /projects/search

Searches for policy documents matching given criteria across policies.

**Authentication:** Required

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| query | string | No | Text search query |
| filters | object | No | Field-level filter criteria |
| policyIds | string[] | No | Limit search to specific policies |
| schemaIds | string[] | No | Limit to specific schema types |
| pageIndex | number | No | Page number |
| pageSize | number | No | Items per page |

### Response 200 OK

Array of matching project/document objects.

| Field | Type | Description |
|---|---|---|
| id | string | Document ID |
| policyId | string | Source policy ID |
| schemaId | string | Document schema ID |
| owner | string | Document owner DID |
| document | object | The VC document |
| coordinates | object | Geographic coordinates (if present) |
| createDate | string | Creation timestamp |

### Example

**Request:**
```http
POST /api/v1/projects/search
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "filters": { "country": "Kenya" },
  "schemaIds": ["irec-installer-schema-uuid"],
  "pageIndex": 0,
  "pageSize": 20
}
```

**Response 200:**
```json
[
  {
    "id": "doc-id-123",
    "policyId": "63e3e5e8a01b3c001234abcd",
    "owner": "did:hedera:testnet:...",
    "document": { ... },
    "coordinates": { "lat": -1.2921, "lng": 36.8219 }
  }
]
```

---

## POST /projects/compare/documents

Compares two project documents field by field.

**Authentication:** Required

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| documentId1 | string | Yes* | First document ID |
| documentId2 | string | Yes* | Second document ID |
| documentIds | string[] | Yes* | Array of document IDs (alternative) |
| propLvl | number | No | Property comparison depth |

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| left | object | First document metadata |
| right | object | Second document metadata |
| fields | array | Field-level comparison results |
| rate | number | Similarity rate (0.0–1.0) |

### Example

**Request:**
```http
POST /api/v1/projects/compare/documents
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "documentId1": "doc-id-001",
  "documentId2": "doc-id-002"
}
```

**Response 200:**
```json
{
  "left": { "id": "doc-id-001", "owner": "did:hedera:..." },
  "right": { "id": "doc-id-002", "owner": "did:hedera:..." },
  "rate": 0.75,
  "fields": [
    { "name": "facilityName", "left": "Solar Farm A", "right": "Solar Farm B", "equal": false },
    { "name": "country", "left": "Kenya", "right": "Kenya", "equal": true }
  ]
}
```

---

## GET /projects/properties

Returns all available project properties (field names) across all schemas.

**Authentication:** Required

### Response 200 OK

Array of property descriptor objects.

| Field | Type | Description |
|---|---|---|
| name | string | Property field name |
| title | string | Human-readable title |
| type | string | Field data type |
| schemaId | string | Schema this property belongs to |
