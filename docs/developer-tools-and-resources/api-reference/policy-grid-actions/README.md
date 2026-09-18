# Policy Grid Actions APIs

The Policy Grid Actions API lets external integrators discover and execute workflow actions (e.g. **Approve**, **Reject**) defined inside Guardian policy grid containers — without reverse-engineering the internal policy block structure or touching any ephemeral block UUID.

## Concept

A Guardian policy organises its UI into **grid containers** (`interfaceDocumentsSourceBlock`). Each grid contains **rows** (VC documents) and **action controls** bound to individual columns. Three kinds of controls are supported:

* **Selector / button actions** (Approve/Reject-style) — apply a fixed field mutation, body is `{}`.
* **Dropdown actions** — assign a value chosen from a live list (e.g. assigning a VVB to a project), body is `{ "value": "..." }`.
* **Request-VC-document actions** — submit a form that mints a brand-new signed VC referencing the row (e.g. "Submit Final Amount"), body is `{ "document": { ... } }`.

The exact body shape for a given action is always described by its `inputSchema`, returned by [List Actions](list-actions.md) — check it rather than assuming an empty body works.

The Grid Actions API exposes three stable abstractions:

| Concept    | Stable identifier                                                                         | Notes                               |
| ---------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| **Grid**   | `gridId` — the block's author-assigned `.tag`, or `sha256(uuid).slice(0,16)` fallback     | Stable across policy redeploys      |
| **Action** | `actionId` — the option `.tag` (for selector actions) or the block `.tag` / hash fallback | Returned by List Actions            |
| **Record** | `_id` — the MongoDB document `_id` returned by Get Records                                | Use verbatim in Execute Action call |

Block UUIDs are never exposed in any request or response.

## Authentication

All endpoints require a valid Guardian JWT bearer token in the `Authorization` header. The caller must hold at least one of:

* `POLICIES_POLICY_EXECUTE`
* `POLICIES_POLICY_MANAGE`

Actions are further filtered by the caller's policy role — the API never returns or allows execution of actions whose `requiredRoles` the caller does not hold.

***

## Endpoints

| # | Endpoint                            | Description                                |
| - | ----------------------------------- | ------------------------------------------ |
| 1 | [List Grids](list-grids.md)         | Discover all grids visible to the caller   |
| 2 | [List Actions](list-actions.md)     | List executable actions on a specific grid |
| 3 | [Get Records](get-records.md)       | Fetch paginated records from a grid        |
| 4 | [Execute Action](execute-action.md) | Trigger a workflow action on a record      |

***

## Workflow Example — Approve a Document

**Step 1 — Discover grids**

`GET /policies/{policyId}/grids`

```json
[
  {
    "gridId": "installer_documents_grid",
    "title": "Installer Activity Reports",
    "columnSchema": [
      { "name": "status", "title": "Status", "type": "text", "bindActions": ["approve_action", "reject_action"] }
    ]
  }
]
```

**Step 2 — List available actions**

`GET /policies/{policyId}/grids/installer_documents_grid/actions`

```json
[
  { "actionId": "approve_action", "label": "Approved", "requiredRoles": ["Standard Registry"], "appliesTo": "row" },
  { "actionId": "reject_action",  "label": "Rejected",  "requiredRoles": ["Standard Registry"], "appliesTo": "row" }
]
```

**Step 3 — Fetch records**

`GET /policies/{policyId}/grids/installer_documents_grid/records?pageSize=1`

```json
{
  "data": [
    {
      "_id": "6627f3b2e4b0c1a2b3c4d5e6",
      "owner": "did:hedera:testnet:z...",
      "option": { "status": "Submitted" },
      "_actions": ["approve_action", "reject_action"]
    }
  ],
  "page": 1,
  "pageSize": 1,
  "totalCount": 42,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

**Step 4 — Execute the approve action**

`POST /policies/{policyId}/grids/installer_documents_grid/records/6627f3b2e4b0c1a2b3c4d5e6/actions/approve_action`

Request body:

```json
{}
```

Response `200 OK`:

```json
{}
```

**Step 5 — Confirm the change**

Re-fetch the record — `option.status` is now `"Approved"`:

```json
{
  "data": [
    {
      "_id": "6627f3b2e4b0c1a2b3c4d5e6",
      "option": { "status": "Approved" },
      "_actions": ["approve_action", "reject_action"]
    }
  ]
}
```

***

## Error Reference

| HTTP status | Meaning                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| 400         | Execute Action call is missing a body field the action requires (`value` for dropdown, `document` for request-VC-document) |
| 401         | Missing or invalid JWT                                                                                                     |
| 403         | Caller lacks required permission (`POLICIES_POLICY_EXECUTE` / `POLICIES_POLICY_MANAGE`)                                    |
| 404         | `gridId`, `actionId`, or `recordId` not found                                                                              |
| 503         | Policy instance not running, or grid / action not available to the caller's role                                           |
| 500         | Unexpected internal error                                                                                                  |
