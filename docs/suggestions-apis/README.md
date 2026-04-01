# Policy Block Suggestions APIs

Base URL: `/api/v1/suggestions`
Authentication: All endpoints require Bearer JWT. Standard Registry role required.

The suggestions engine uses an AI/ML model to recommend the next appropriate block types when building a policy. It analyses the current policy graph position and returns ranked suggestions for what block to add next.

---

## POST /suggestions

Returns suggested next and nested block types based on the current policy block context.

**Authentication:** Required — `SUGGESTIONS_SUGGESTIONS_READ` (Standard Registry)

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| blockType | string | Yes | The `BlockType` enum value of the current block (e.g., `"requestVcDocumentBlock"`) |
| children | string[] | No | Array of `BlockType` values of the current block's existing children |
| parent | string | No | `BlockType` of the parent block in the policy graph |

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| next | string[] | Ranked list of `BlockType` values suggested as the next sibling block |
| nested | string[] | Ranked list of `BlockType` values suggested as a child block |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden — not a Standard Registry user |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/suggestions
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "blockType": "requestVcDocumentBlock",
  "children": [],
  "parent": "interfaceStepBlock"
}
```

**Response 200:**
```json
{
  "next": [
    "interfaceDocumentsSourceBlock",
    "switchBlock",
    "sendToGuardianBlock"
  ],
  "nested": [
    "requestVcDocumentBlockAddon",
    "filtersAddon"
  ]
}
```

---

## POST /suggestions/config

Sets the suggestions engine configuration, defining which block ordering/priority model to use.

**Authentication:** Required — `SUGGESTIONS_SUGGESTIONS_UPDATE` (Standard Registry)

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| items | array | Yes | Array of suggestion configuration items |
| items[].id | string | Yes | Configuration item identifier |
| items[].blockType | string | Yes | Block type this config applies to |
| items[].enabled | boolean | Yes | Whether suggestions are enabled for this block type |
| items[].options | object | No | Additional model options |

### Response 201 Created

Returns the saved configuration.

| Field | Type | Description |
|---|---|---|
| items | array | The saved suggestion config items |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/suggestions/config
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "items": [
    {
      "id": "config-1",
      "blockType": "requestVcDocumentBlock",
      "enabled": true
    }
  ]
}
```

**Response 201:**
```json
{
  "items": [
    {
      "id": "config-1",
      "blockType": "requestVcDocumentBlock",
      "enabled": true
    }
  ]
}
```

---

## GET /suggestions/config

Returns the current suggestions engine configuration.

**Authentication:** Required — `SUGGESTIONS_SUGGESTIONS_READ` (Standard Registry)

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| items | array | Current suggestion configuration items |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/suggestions/config
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
{
  "items": [
    { "id": "config-1", "blockType": "requestVcDocumentBlock", "enabled": true },
    { "id": "config-2", "blockType": "switchBlock", "enabled": true }
  ]
}
```
