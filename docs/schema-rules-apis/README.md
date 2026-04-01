# Schema Rules APIs

Base URL: `/api/v1/schema-rules`
Authentication: All endpoints require Bearer JWT.

Schema Rules define validation rule sets applied to schema documents within policies. Rules specify field-level constraints, cross-field dependencies, and data quality checks beyond basic JSON Schema validation.

---

## POST /schema-rules

Creates a new schema rule.

**Authentication:** Required — `SCHEMA_RULE_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Rule name |
| description | string | No | Description |
| schemaId | string | Yes | ID of the schema this rule applies to |
| policyId | string | No | Policy this rule is scoped to |
| config | object | No | Rule configuration (conditions, constraints) |

### Response 201 Created

Returns the created rule object.

| Field | Type | Description |
|---|---|---|
| id | string | Rule database ID |
| uuid | string | Rule UUID |
| name | string | Rule name |
| status | string | `DRAFT` or `ACTIVE` |
| schemaId | string | Linked schema ID |
| owner | string | Owner DID |

---

## GET /schema-rules

Returns a paginated list of schema rules.

**Authentication:** Required — `SCHEMA_RULE_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Page number |
| pageSize | number | No | Items per page |
| policyId | string | No | Filter by policy |
| schemaId | string | No | Filter by schema |

### Response 200 OK

Array of rule objects. Total count in `X-Total-Count`.

### Example

**Request:**
```http
GET /api/v1/schema-rules?schemaId=schema-uuid-123
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

## GET /schema-rules/:ruleId

Retrieves a specific schema rule.

**Authentication:** Required — `SCHEMA_RULE_READ`

---

## PUT /schema-rules/:ruleId

Updates a schema rule. Only `DRAFT` or `INACTIVE` rules can be updated.

**Authentication:** Required — `SCHEMA_RULE_UPDATE`

---

## DELETE /schema-rules/:ruleId

Deletes a schema rule.

**Authentication:** Required — `SCHEMA_RULE_DELETE`

---

## PUT /schema-rules/:ruleId/activate

Activates a schema rule, enabling it to validate documents.

**Authentication:** Required — `SCHEMA_RULE_UPDATE`

### Response 200 OK

Returns the activated rule with `status: "ACTIVE"`.

### Example

**Request:**
```http
PUT /api/v1/schema-rules/rule-id-123/activate
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
{
  "id": "rule-id-123",
  "name": "MRV Data Quality Rules",
  "status": "ACTIVE",
  "schemaId": "schema-uuid-123"
}
```

---

## PUT /schema-rules/:ruleId/inactivate

Deactivates a schema rule without deleting it.

**Authentication:** Required — `SCHEMA_RULE_UPDATE`

### Response 200 OK

Returns the rule with `status: "INACTIVE"`.

---

## GET /schema-rules/:ruleId/relationships

Returns all policies and schemas linked to this rule.

**Authentication:** Required — `SCHEMA_RULE_READ`

---

## POST /schema-rules/data

Validates a document against applicable schema rules.

**Authentication:** Required — `SCHEMA_RULE_READ`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| schemaId | string | Yes | Schema ID to find rules for |
| document | object | Yes | Document to validate |
| policyId | string | No | Policy context for rule lookup |

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| valid | boolean | Whether the document passes all active rules |
| errors | array | Array of rule violation messages |
| warnings | array | Array of non-blocking rule warnings |

### Example

**Request:**
```http
POST /api/v1/schema-rules/data
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "schemaId": "schema-uuid-123",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "document": {
    "credentialSubject": [
      {
        "field0": 0.0,
        "field1": 1250.5,
        "field2": "MWh"
      }
    ]
  }
}
```

**Response 200:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "field1 value 1250.5 is unusually high — verify meter readings"
  ]
}
```

---

## POST /schema-rules/:policyId/import/file

Imports schema rules from a ZIP file into a policy.

**Authentication:** Required — `SCHEMA_RULE_CREATE`

**Content-Type:** `multipart/form-data`
