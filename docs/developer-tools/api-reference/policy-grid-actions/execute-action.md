# Execute an Action on a Record

**`POST /policies/{policyId}/grids/{gridId}/records/{recordId}/actions/{actionId}`**

Executes the named workflow action on the specified record. The server resolves `gridId` and
`actionId` to the appropriate internal policy block and option value. No block UUID is ever
exposed or required.

---

## Authentication

Requires a valid Guardian JWT bearer token. The caller must hold at least one of:

- `POLICIES_POLICY_EXECUTE`
- `POLICIES_POLICY_MANAGE`

The action block's own `requiredRoles` are also enforced — the caller must hold a matching
policy role.

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `policyId`   | string | Yes | MongoDB ObjectId of the running policy |
| `gridId`     | string | Yes | Stable grid identifier from [List Grids](list-grids.md) |
| `recordId`   | string | Yes | The `_id` value from [Get Records](get-records.md) |
| `actionId`   | string | Yes | The `actionId` value from [List Actions](list-actions.md) |

### Request Body

The required body shape depends on the action's `inputSchema`, returned by
[List Actions](list-actions.md). Check that response first — do not assume an empty body works.

#### Selector / button actions (e.g. Approve, Reject)

An empty object is sufficient. The server resolves the document internally and applies the
configured field mutation:

```json
{}
```

#### Dropdown actions (e.g. assigning an entity to a record)

Send the chosen `value` — it must be one of the values listed in the action's
`inputSchema.properties.value.enum` (from List Actions). The server writes it onto the field
named in that action's description (e.g. `assignedTo`) and triggers the block's event chain:

```json
{ "value": "did:hedera:testnet:xxxxxx...VVB1" }
```

Omitting `value` returns `400 Bad Request`:
```json
{ "statusCode": 400, "message": "This action requires a \"value\" body field with the selected option value" }
```

#### Request-VC-document actions (e.g. submitting a form that mints a new VC)

Send the caller-editable fields under `document`, matching the schema named in the action's
`inputSchema.properties.document.description`. Read-only fields (`@context`, `type`, `policyId`,
`ref`, etc.) are populated server-side — do not include them. This creates a brand-new signed VC
referencing the current record; it is **not idempotent**.

```json
{ "document": { "finalMintAmount": 1500 } }
```

Omitting `document` returns `400 Bad Request`:
```json
{ "statusCode": 400, "message": "This action requires a \"document\" body with the form fields to submit" }
```

---

## Response

### Success Response

**Status:** `200 OK`  
**Body:** `{}`

The `200` status code is the success signal. The action triggers an internal Guardian event
chain. Re-fetch [Get Records](get-records.md) to observe the updated field value (e.g.
`option.status` changes from `"Submitted"` to `"Approved"`).

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Required body field missing for this action's type (`value` for dropdown, `document` for request-VC-document) |
| `401 Unauthorized` | JWT token missing or invalid |
| `403 Forbidden` | Insufficient permissions, or caller's role does not satisfy the action's `requiredRoles` |
| `404 Not Found` | `gridId`, `actionId`, or `recordId` not found |
| `503 Service Unavailable` | Policy instance not running, or action not available to the caller's role |
| `500 Internal Server Error` | Unexpected server failure |

