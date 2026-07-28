# List Actions on a Grid

**`GET /policies/{policyId}/grids/{gridId}/actions`**

Returns all row-level actions the caller's role may execute on the specified grid. Actions whose
`requiredRoles` the caller does not hold are automatically omitted, inaccessible actions are
never leaked.

---

## Authentication

Requires a valid Guardian JWT bearer token. The caller must hold at least one of:

- `POLICIES_POLICY_EXECUTE`
- `POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `policyId` | string | Yes | MongoDB ObjectId of the running policy |
| `gridId`   | string | Yes | Stable grid identifier returned by [List Grids](list-grids.md) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "actionId": "approve_action",
    "label": "Approved",
    "requiredRoles": ["Standard Registry"],
    "appliesTo": "row",
    "inputSchema": { "type": "object", "properties": {} }
  },
  {
    "actionId": "reject_action",
    "label": "Rejected",
    "requiredRoles": ["Standard Registry"],
    "appliesTo": "row",
    "inputSchema": { "type": "object", "properties": {} }
  },
  {
    "actionId": "assign_vvb",
    "label": "VVB",
    "requiredRoles": ["PROJECT_DEVELOPER"],
    "appliesTo": "row",
    "inputSchema": {
      "type": "object",
      "required": ["value"],
      "properties": {
        "value": {
          "description": "Value to set on field \"assignedTo\"",
          "enum": ["did:hedera:testnet:xxxxxx...VVB1", "did:hedera:testnet:yyyyyy...VVB2"],
          "options": [
            { "name": "Xeno VVB", "value": "did:hedera:testnet:xxxxxx...VVB1" },
            { "name": "Acme VVB", "value": "did:hedera:testnet:yyyyyy...VVB2" }
          ]
        }
      }
    }
  },
  {
    "actionId": "final_mint_button",
    "label": "Submit Final Amount",
    "requiredRoles": ["ANY_ROLE"],
    "appliesTo": "row",
    "inputSchema": {
      "type": "object",
      "required": ["document"],
      "properties": {
        "document": {
          "type": "object",
          "description": "Credential subject conforming to schema #c9efd555-0f02-4301-9b0b-792ec7edda90&1.0.0"
        }
      }
    }
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `actionId` | string | Stable action identifier — use this in the [Execute Action](execute-action.md) call |
| `label` | string | Human-readable action label |
| `requiredRoles` | array | Policy roles that may execute this action |
| `appliesTo` | string | Always `"row"` — actions target individual records |
| `inputSchema` | object | JSON Schema describing the action's request body. Shape depends on the underlying block type: |

**`inputSchema` by action type:**

| Underlying block | Body shape | Notes |
|---|---|---|
| Selector / button (e.g. Approve, Reject) | `{}` (empty) | `inputSchema.properties` is empty — no body needed |
| Dropdown (e.g. assigning an entity to a record) | `{ "value": "<choice>" }` | `inputSchema.properties.value.enum` lists the currently valid values, resolved live (e.g. from registered entities); `.options` pairs each value with a human-readable `name` |
| Request-VC-document (e.g. submitting a form that mints a new VC) | `{ "document": { ... } }` | `inputSchema.properties.document.description` names the schema IRI the submitted fields must conform to |

See [Execute Action](execute-action.md) for full request/response examples of each shape.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | JWT token missing or invalid |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | `gridId` not found in this policy |
| `503 Service Unavailable` | Policy instance not running, or grid not available to the caller's role |
| `500 Internal Server Error` | Unexpected server failure |

