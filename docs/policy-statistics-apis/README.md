# Policy Statistics APIs

Base URL: `/api/v1/policy-statistics`
Authentication: All endpoints require Bearer JWT.

Policy Statistics definitions specify metrics and assessments that can be applied to policy documents. They provide quantitative evaluation of documents based on configurable criteria.

---

## POST /policy-statistics

Creates a new statistic definition.

**Authentication:** Required — `STATISTICS_STATISTIC_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Statistic definition name |
| description | string | No | Description |
| config | object | No | Statistic configuration (scoring rules, field mappings) |
| policyId | string | No | Policy this statistic is scoped to |
| schemaId | string | No | Schema this statistic applies to |

### Response 201 Created

Returns the created statistic definition.

| Field | Type | Description |
|---|---|---|
| id | string | Statistic database ID |
| uuid | string | UUID |
| name | string | Name |
| status | string | `DRAFT` or `PUBLISHED` |
| owner | string | Owner DID |
| messageId | string | Hedera message ID (after publishing) |

---

## GET /policy-statistics

Returns a paginated list of all statistic definitions.

**Authentication:** Required — `STATISTICS_STATISTIC_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Page number |
| pageSize | number | No | Items per page |
| policyId | string | No | Filter by policy |

### Response 200 OK

Array of statistic definition objects. Total count in `X-Total-Count`.

### Example

**Request:**
```http
GET /api/v1/policy-statistics?policyId=63e3e5e8a01b3c001234abcd
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  {
    "id": "63e3e5e8a01b3c001234xyz",
    "name": "MRV Quality Score",
    "status": "PUBLISHED",
    "policyId": "63e3e5e8a01b3c001234abcd"
  }
]
```

---

## GET /policy-statistics/:definitionId

Retrieves a specific statistic definition.

**Authentication:** Required — `STATISTICS_STATISTIC_READ`

---

## PUT /policy-statistics/:definitionId

Updates a statistic definition (only `DRAFT` status).

**Authentication:** Required — `STATISTICS_STATISTIC_UPDATE`

---

## DELETE /policy-statistics/:definitionId

Deletes a statistic definition.

**Authentication:** Required — `STATISTICS_STATISTIC_DELETE`

---

## PUT /policy-statistics/:definitionId/publish

Publishes a statistic definition to the Hedera blockchain.

**Authentication:** Required — `STATISTICS_STATISTIC_REVIEW`

### Response 200 OK

Returns the published definition with `messageId` set.

---

## GET /policy-statistics/:definitionId/relationships

Returns all entities linked to this statistic definition.

**Authentication:** Required — `STATISTICS_STATISTIC_READ`

---

## GET /policy-statistics/:definitionId/documents

Returns all policy documents that this statistic has been evaluated against.

**Authentication:** Required — `STATISTICS_STATISTIC_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Page number |
| pageSize | number | No | Items per page |

### Response 200 OK

Array of document objects with their statistic evaluation results.

| Field | Type | Description |
|---|---|---|
| id | string | Document ID |
| document | object | The VC document |
| score | number | Calculated statistic score |
| assessment | object | Assessment result details |
| createDate | string | Evaluation timestamp |

---

## POST /policy-statistics/:definitionId/assessment

Creates a new statistic assessment for a document.

**Authentication:** Required — `STATISTICS_STATISTIC_CREATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| definitionId | string | Yes | Statistic definition ID |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| documentId | string | Yes | ID of the document to assess |
| document | object | No | Document content (if not providing documentId) |

### Response 201 Created

Returns the assessment result.

| Field | Type | Description |
|---|---|---|
| id | string | Assessment ID |
| definitionId | string | Statistic definition used |
| documentId | string | Evaluated document ID |
| score | number | Calculated score |
| fields | object | Field-level scores |
| createDate | string | Assessment timestamp |

### Example

**Request:**
```http
POST /api/v1/policy-statistics/stat-def-id/assessment
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "documentId": "doc-id-123"
}
```

**Response 201:**
```json
{
  "id": "assessment-id-456",
  "definitionId": "stat-def-id",
  "documentId": "doc-id-123",
  "score": 87.5,
  "fields": {
    "completeness": 95,
    "accuracy": 80
  },
  "createDate": "2026-03-31T08:00:00.000Z"
}
```

---

## GET /policy-statistics/:definitionId/assessment

Returns all assessments made against this statistic definition.

**Authentication:** Required — `STATISTICS_STATISTIC_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Page number |
| pageSize | number | No | Items per page |

### Response 200 OK

Array of assessment objects. Total count in `X-Total-Count`.
