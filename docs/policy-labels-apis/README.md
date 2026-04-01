# Policy Labels APIs

Base URL: `/api/v1/policy-labels`
Authentication: All endpoints require Bearer JWT.

Policy Labels are reusable metadata definitions that can be applied to policy documents for categorization, reporting, and compliance tracking purposes. They are published to the Hedera blockchain.

---

## POST /policy-labels

Creates a new policy label definition.

**Authentication:** Required — `LABELS_LABEL_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Label name |
| description | string | No | Label description |
| config | object | No | Label configuration (field definitions) |
| policyId | string | No | Policy this label is scoped to |

### Response 201 Created

Returns the created label definition.

| Field | Type | Description |
|---|---|---|
| id | string | Label database ID |
| uuid | string | Label UUID |
| name | string | Label name |
| status | string | `DRAFT` or `PUBLISHED` |
| owner | string | Owner DID |
| messageId | string | Hedera message ID (after publishing) |

---

## GET /policy-labels

Returns a paginated list of all label definitions.

**Authentication:** Required — `LABELS_LABEL_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |
| policyId | string | No | Filter by linked policy |

### Response 200 OK

Array of label objects. Total count in `X-Total-Count` header.

### Example

**Request:**
```http
GET /api/v1/policy-labels?pageIndex=0&pageSize=20
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Gold Standard Verified",
    "status": "PUBLISHED",
    "owner": "did:hedera:testnet:..."
  }
]
```

---

## GET /policy-labels/:definitionId

Retrieves a specific label definition.

**Authentication:** Required — `LABELS_LABEL_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| definitionId | string | Yes | Label definition ID |

---

## PUT /policy-labels/:definitionId

Updates a label definition. Only `DRAFT` status labels can be updated.

**Authentication:** Required — `LABELS_LABEL_UPDATE`

---

## DELETE /policy-labels/:definitionId

Deletes a label definition.

**Authentication:** Required — `LABELS_LABEL_DELETE`

---

## PUT /policy-labels/:definitionId/publish

Publishes a label definition to the Hedera blockchain.

**Authentication:** Required — `LABELS_LABEL_REVIEW`

### Response 200 OK

Returns the published label with `messageId` set.

---

## PUT /policy-labels/push/:definitionId/publish

Publishes a label asynchronously. Returns a task ID.

**Authentication:** Required — `LABELS_LABEL_REVIEW`

### Response 200 OK

Returns a `TaskDTO` with `taskId`.

---

## GET /policy-labels/:definitionId/relationships

Returns all entities linked to this label definition.

**Authentication:** Required — `LABELS_LABEL_READ`

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| id | string | Label ID |
| policies | array | Linked policies |
| schemas | array | Linked schemas |

---

## POST /policy-labels/:policyId/import/file

Imports label definitions from a ZIP file into a policy.

**Authentication:** Required — `LABELS_LABEL_CREATE`

**Content-Type:** `multipart/form-data`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Target policy ID |

---

## GET /policy-labels/:definitionId/export/file

Exports a label definition as a ZIP file.

**Authentication:** Required — `LABELS_LABEL_READ`

### Response 200 OK

Binary ZIP file download.
