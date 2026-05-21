# 1987 Top Level API

## Policy API Documentation & DMRV Aliases

Github Issue

[https://github.com/hashgraph/guardian/issues/1987](https://github.com/hashgraph/guardian/issues/1987)



Overview

This contribution allows policy authors to define clean, human-readable API endpoint aliases for their policies, giving each integration point a simple, descriptive name instead of a raw internal URL. These aliases, along with descriptions, can be configured directly in the policy editor and are published as browsable documentation, making it significantly easier for external systems and third-party developers to integrate with a policy's API without needing to understand its internal structure.

### 1. Configuring API Documentation

#### 1.1. Open the Configuration Dialog

1. Open any policy in Draft status in the Policy Configurator.
2. Click the API button in the top toolbar.

<br>

<img src="../../../.gitbook/assets/unknown (10).png" alt="" height="285" width="589">

#### 1.2. Add Endpoints

1. Click + Add Endpoint.
2. Fill in the fields for each row:

| Field       | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| Block       | Select a block from the dropdown list                        |
| Method      | Choose BOTH, GET or POST                                     |
| Name        | Short name (auto-filled from block name)                     |
| Description | What the endpoint does                                       |
| Alias       | URL-friendly identifier, e.g. new-device, create-application |
| Preview URL | Read-only: /api/v1/dmrv/{policyId}/{alias}                   |

#### 1.3. Validation Rules

* Alias: only a-z, 0-9, - allowed
* Block, Alias must be unique
* Block and Alias are required

Errors appear below the corresponding row.

<br>

<img src="../../../.gitbook/assets/unknown (12).png" alt="" height="331" width="589">

#### 1.4. Save

1. Click Save in the modal to apply changes locally.
2. Click Save in the toolbar to persist the policy to the database.

Note: URL generation (both technical and DMRV) happens server-side on policy save.

<br>

### 2. Viewing Documentation

1. Go to Policies → Manage Policies.
2. Click the Documentation button (book icon) on a policy row.

<br>

<img src="../../../.gitbook/assets/unknown (13).png" alt="" height="528" width="473">

3. The dialog shows all configured endpoints:

| Column      | Description                               |
| ----------- | ----------------------------------------- |
| Name        | Endpoint name                             |
| Description | User-provided description                 |
| Method      | BOTH (blue), GET (green) or POST (orange) |
| URL         | Technical URL to block by tag             |
| Alias URL   | External DMRV URL                         |
| Copy        | Copies Alias URL to clipboard             |

<br>

<img src="../../../.gitbook/assets/unknown (14).png" alt="" height="126" width="665">

<br>

### 3. Using the DMRV Proxy

#### 3.1. Endpoint

ANY /api/v1/dmrv/:policyId/:alias

#### 3.2. How It Works

Request: GET /api/v1/dmrv/{policyId}/new-device

&#x20;           │

&#x20;           ▼

&#x20;  1\. Load policy by policyId

&#x20;  2\. Find entry: alias="new-device", method="GET"

&#x20;  3\. Resolve: target="new\_device"

&#x20;  4\. Forward → getBlockByTagName(user, policyId, "new\_device")

&#x20;  5\. Return block response

#### 3.3. Method Routing

| Request Method | Internal Call     | Equivalent Standard Endpoint              |
| -------------- | ----------------- | ----------------------------------------- |
| GET            | getBlockByTagName | GET /api/v1/policies/:id/tag/:tag         |
| POST           | setBlockDataByTag | POST /api/v1/policies/:id/tag/:tag/blocks |

#### 3.4. Authentication

Standard Bearer token. Required permissions: POLICIES\_POLICY\_EXECUTE, POLICIES\_POLICY\_MANAGE.

#### 3.5. Response Codes

| Code | Meaning                                                                     |
| ---- | --------------------------------------------------------------------------- |
| 200  | Success                                                                     |
| 401  | Unauthorized                                                                |
| 404  | Policy not found or alias not configured for this method                    |
| 503  | Block Unavailable (block exists but not accessible in current policy state) |

#### 3.6. Example

Request:

GET /api/v1/dmrv/69c3dbe9a4d2ac84f75cdfc4/choose-role-alias

Authorization: Bearer \<token>

Response:

{

"id": "2326c495-eb61-4119-aeab-1a5104176457"

}



### 4. API Reference: GET /api/v1/policies/:policyId/about

Returns the configured documentation entries.

Response example:

```json
[
    {
        "name": "reg_form",
        "description": "reg form",
        "target": "registrant_form_grid",
        "method": "GET",
        "alias": "reg",
        "url": "/api/v1/policies/69c3dbe9a4d2ac84f75cdfc4/tag/registrant_form_grid",
        "dmrvUrl": "/api/v1/dmrv/69c3dbe9a4d2ac84f75cdfc4/reg",
        "blockType": "interfaceDocumentsSourceBlock",
        "queryParams": [
            {
                "name": "page",
                "type": "number",
                "description": "Page number (0-based)"
            },
            {
                "name": "itemsPerPage",
                "type": "number",
                "description": "Items per page"
            },
            {
                "name": "sortField",
                "type": "string",
                "description": "Field name to sort by"
            },
            {
                "name": "sortDirection",
                "type": "string",
                "description": "Sort direction (asc/desc)"
            },
            {
                "name": "filterByUUID",
                "type": "string",
                "description": "Filter by document UUID"
            },
            {
                "name": "savepointIds",
                "type": "string[]",
                "description": "Savepoint IDs filter (JSON array)"
            }
        ]
    }
]

```

<br>
