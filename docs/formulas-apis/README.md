# Formulas APIs

Base URL: `/api/v1/formulas`
Authentication: All endpoints require Bearer JWT.

Formulas define reusable mathematical or logical expressions used within policy calculations. They can be published, imported, and linked to policies and schemas.

---

## POST /formulas

Creates a new formula.

**Authentication:** Required — `FORMULAS_FORMULA_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Formula name |
| description | string | No | Human-readable description |
| config | object | No | Formula expression configuration |
| policyId | string | No | ID of the policy this formula is linked to |
| schemaId | string | No | ID of the schema this formula is linked to |

### Response 201 Created

Returns the created formula object.

| Field | Type | Description |
|---|---|---|
| id | string | Formula database ID |
| uuid | string | Formula UUID |
| name | string | Formula name |
| description | string | Description |
| status | string | `DRAFT` or `PUBLISHED` |
| owner | string | Owner DID |
| policyId | string | Linked policy ID |
| config | object | Formula configuration |

---

## GET /formulas

Returns a paginated list of all formulas visible to the authenticated user.

**Authentication:** Required — `FORMULAS_FORMULA_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |
| policyId | string | No | Filter by linked policy |

### Response 200 OK

Array of formula objects. Total count in `X-Total-Count` header.

### Example

**Request:**
```http
GET /api/v1/formulas?pageIndex=0&pageSize=20
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Carbon Credit Calculator",
    "status": "PUBLISHED",
    "policyId": "63e3e5e8a01b3c001234efgh"
  }
]
```

---

## GET /formulas/:formulaId

Retrieves a specific formula with full configuration.

**Authentication:** Required — `FORMULAS_FORMULA_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| formulaId | string | Yes | Formula database ID |

---

## PUT /formulas/:formulaId

Updates a formula. Only `DRAFT` status formulas can be updated.

**Authentication:** Required — `FORMULAS_FORMULA_UPDATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| formulaId | string | Yes | Formula database ID |

### Request Body

Updated formula fields.

---

## DELETE /formulas/:formulaId

Deletes a formula.

**Authentication:** Required — `FORMULAS_FORMULA_DELETE`

---

## GET /formulas/:formulaId/relationships

Returns all entities (policies, schemas, other formulas) that reference this formula.

**Authentication:** Required — `FORMULAS_FORMULA_READ`

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| id | string | Formula ID |
| policies | array | Linked policy references |
| schemas | array | Linked schema references |

---

## POST /formulas/:policyId/import/file

Imports a formula from a ZIP file into a specific policy context.

**Authentication:** Required — `FORMULAS_FORMULA_CREATE`

**Content-Type:** `multipart/form-data`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy ID to import the formula into |

### Response 201 Created

Returns the imported formula.

---

## GET /formulas/:formulaId/export/file

Exports a formula and its dependencies as a ZIP file.

**Authentication:** Required — `FORMULAS_FORMULA_READ`

### Response 200 OK

Binary ZIP file download.

---

## POST /formulas/import/file/preview

Previews a formula ZIP import without saving.

**Authentication:** Required — `FORMULAS_FORMULA_CREATE`

**Content-Type:** `multipart/form-data`

### Response 200 OK

Returns formula metadata preview.

---

## PUT /formulas/:formulaId/draft

Returns a published formula to draft status for editing.

**Authentication:** Required — `FORMULAS_FORMULA_UPDATE`
