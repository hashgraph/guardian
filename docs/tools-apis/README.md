# Tools APIs

Base URL: `/api/v1/tools`
Authentication: All endpoints require Bearer JWT. Most require Standard Registry role.

Policy Tools are reusable policy components (sub-graphs of blocks) that can be published and imported across policies. They reduce duplication when the same logic appears in multiple policies.

---

## POST /tools

Creates a new policy tool.

**Authentication:** Required — `TOOLS_TOOL_CREATE` (Standard Registry)

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Tool name |
| description | string | No | Tool description |
| config | object | No | Initial block configuration (JSON) |
| tags | string[] | No | Tag labels |

### Response 201 Created

Returns the created tool object.

| Field | Type | Description |
|---|---|---|
| id | string | Tool database ID |
| uuid | string | Tool UUID |
| name | string | Tool name |
| description | string | Description |
| status | string | `DRAFT`, `PUBLISH` |
| owner | string | Owner DID |
| messageId | string | Hedera message ID (set after publishing) |
| config | object | Block configuration |
| createDate | string | Creation timestamp |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Not a Standard Registry |
| 500 | Internal server error |

---

## POST /tools/push

Creates a new tool asynchronously. Returns a task ID immediately; creation happens in the background.

**Authentication:** Required — `TOOLS_TOOL_CREATE` (Standard Registry)

### Request Body

Same as `POST /tools`.

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| taskId | string | Task identifier — poll `GET /tasks/:taskId` for status |
| expectation | object | Estimated completion metadata |

---

## GET /tools

Returns a paginated list of all tools visible to the authenticated user.

**Authentication:** Required — `TOOLS_TOOL_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |

### Response 200 OK

Array of tool objects. Total count in `X-Total-Count` header.

### Example

**Request:**
```http
GET /api/v1/tools?pageIndex=0&pageSize=20
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```
X-Total-Count: 5
```
```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "MRV Calculation Tool",
    "status": "PUBLISH",
    "owner": "did:hedera:testnet:...",
    "messageId": "1711800000.000000000"
  }
]
```

---

## GET /tools/:id

Retrieves a single tool's full configuration.

**Authentication:** Required — `TOOLS_TOOL_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | Tool database ID |

### Response 200 OK

Full tool object including block configuration.

---

## PUT /tools/:id

Updates a tool's configuration. Only allowed for `DRAFT` status tools.

**Authentication:** Required — `TOOLS_TOOL_UPDATE` (Standard Registry, tool owner)

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | Tool database ID |

### Request Body

Updated tool fields (same shape as POST).

### Response 200 OK

Returns the updated tool object.

---

## DELETE /tools/:id

Deletes a tool. Only `DRAFT` status tools can be deleted.

**Authentication:** Required — `TOOLS_TOOL_DELETE` (Standard Registry, tool owner)

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | Tool database ID |

### Response 200 OK

Returns `true` on success.

---

## PUT /tools/:id/publish

Publishes a tool to the Hedera blockchain (IPFS + HCS message). Once published, the tool becomes immutable and importable by other Standard Registries.

**Authentication:** Required — `TOOLS_TOOL_REVIEW` (Standard Registry)

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | Tool database ID |

### Response 200 OK

Returns the published tool with `messageId` set.

---

## PUT /tools/:id/push/publish

Publishes a tool asynchronously. Returns a task ID.

**Authentication:** Required — `TOOLS_TOOL_REVIEW` (Standard Registry)

### Response 200 OK

Returns a `TaskDTO` object with `taskId`.

---

## PUT /tools/:id/dry-run

Puts a tool into dry-run (test) mode.

**Authentication:** Required — `TOOLS_TOOL_UPDATE`

---

## PUT /tools/:id/draft

Returns a published tool back to draft status for editing.

**Authentication:** Required — `TOOLS_TOOL_UPDATE`

---

## POST /tools/validate

Validates a tool configuration without saving it.

**Authentication:** Required — `TOOLS_TOOL_READ`

### Request Body

Tool configuration object to validate.

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| valid | boolean | Whether the configuration is valid |
| errors | array | Array of validation error messages |

---

## GET /tools/:id/export/file

Downloads the tool and all its artifacts as a ZIP file.

**Authentication:** Required — `TOOLS_TOOL_READ`

### Response 200 OK

Binary ZIP file download (`Content-Type: application/zip`).

---

## GET /tools/:id/export/message

Returns the Hedera message ID for a published tool (for importing into other Guardian instances).

**Authentication:** Required — `TOOLS_TOOL_READ`

### Response 200 OK

```json
{ "messageId": "1711800000.000000000" }
```

---

## POST /tools/import/message/preview

Previews a tool before importing it from Hedera IPFS by message ID.

**Authentication:** Required — `TOOLS_TOOL_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| messageId | string | Yes | Hedera message ID of the tool to preview |

### Response 200 OK

Returns the tool metadata and block summary without importing.
