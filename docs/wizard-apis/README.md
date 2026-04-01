# Wizard APIs

Base URL: `/api/v1/wizard`
Authentication: All endpoints require Bearer JWT. Standard Registry role required.

The Policy Wizard provides a guided interface for creating new policies from a high-level configuration. Instead of manually assembling blocks, you describe the policy structure (roles, schemas, tokens, trust chain) and the wizard generates a complete block graph.

---

## POST /wizard/policy

Creates a new policy from a wizard configuration object (synchronous).

**Authentication:** Required — `POLICIES_POLICY_CREATE` (Standard Registry)

### Request Body (`WizardConfigDTO`)

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Policy name |
| description | string | No | Policy description |
| topicDescription | string | No | Hedera topic description |
| policyTag | string | Yes | Unique policy tag identifier |
| roles | string[] | Yes | Array of role names for policy participants (e.g., `["Installer", "Auditor"]`) |
| schemas | object[] | Yes | Schema definitions used in the policy |
| schemas[].iri | string | Yes | Schema IRI/ID |
| schemas[].name | string | Yes | Schema name |
| schemas[].isApproveEnable | boolean | No | Whether this schema's documents go through an approval step |
| schemas[].isMintSchema | boolean | No | Whether documents using this schema trigger token minting |
| schemas[].mintOptions | object | No | Minting configuration |
| schemas[].mintOptions.tokenId | string | No | Token ID to mint |
| schemas[].mintOptions.rule | string | No | Minting rule expression |
| schemas[].dependencySchemaIri | string | No | IRI of a dependent parent schema |
| schemas[].relationshipsSchemaIri | string | No | IRI of the schema that establishes relationships |
| trustChain | object[] | No | Trust chain configuration linking schemas |

### Response 201 Created

| Field | Type | Description |
|---|---|---|
| policyId | string | ID of the newly created policy |
| wizardConfig | object | The resolved wizard configuration |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Not a Standard Registry |
| 422 | Invalid wizard configuration |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/wizard/policy
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "name": "Simple iREC Policy",
  "policyTag": "simple_irec_v1",
  "roles": ["Installer", "Standard Registry"],
  "schemas": [
    {
      "iri": "#installer-application",
      "name": "Installer Application",
      "isApproveEnable": true,
      "isMintSchema": false
    },
    {
      "iri": "#mrv-report",
      "name": "MRV Report",
      "isApproveEnable": true,
      "isMintSchema": true,
      "mintOptions": {
        "tokenId": "0.0.1234567",
        "rule": "field2"
      },
      "dependencySchemaIri": "#installer-application"
    }
  ]
}
```

**Response 201:**
```json
{
  "policyId": "63e3e5e8a01b3c001234abcd",
  "wizardConfig": { ... }
}
```

---

## POST /wizard/push/policy

Creates a new policy from wizard configuration **asynchronously**. Returns a task ID; creation runs in the background.

**Authentication:** Required — `POLICIES_POLICY_CREATE` (Standard Registry)

### Request Body

Same as `POST /wizard/policy`.

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| taskId | string | Task identifier — poll `GET /tasks/:taskId` for status |
| expectation | object | Estimated operation metadata |

### Example

**Request:**
```http
POST /api/v1/wizard/push/policy
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{ ... same wizard config ... }
```

**Response 200:**
```json
{
  "taskId": "task-uuid-1234",
  "expectation": { "message": "Creating policy", "out": ["policyId"] }
}
```

Poll result:
```http
GET /api/v1/tasks/task-uuid-1234
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

## POST /wizard/:policyId/config

Retrieves or updates the wizard configuration for an existing policy. Used to re-open a policy in the wizard editor.

**Authentication:** Required — `POLICIES_POLICY_UPDATE` (Standard Registry)

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy database ID |

### Request Body

Updated `WizardConfigDTO` to apply to the existing policy.

### Response 200 OK

Returns the updated policy with re-generated wizard configuration.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | Policy not found |
| 500 | Internal server error |
