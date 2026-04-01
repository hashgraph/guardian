# Tags APIs

Base URL: `/api/v1/tags`
Authentication: Most endpoints require Bearer JWT. Tag type `PolicyBlock` requires `POLICIES_POLICY_TAG` permission.

Tags allow users to annotate Guardian entities (policies, schemas, tokens, documents, etc.) with custom labels stored on the Hedera blockchain via HCS messages.

---

## POST /tags

Creates a new tag on a Guardian entity.

**Authentication:** Required — `TAGS_TAG_CREATE`. For `PolicyBlock` entity type, also requires `POLICIES_POLICY_TAG`.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Tag label text |
| description | string | No | Optional tag description |
| entity | string | Yes | Entity type being tagged. One of: `Policy`, `PolicyDocument`, `Token`, `Schema`, `Module`, `Contract`, `PolicyBlock` |
| target | string | Yes | Hedera message ID or entity ID of the target object |
| localTarget | string | No | Local database ID of the target (used when message ID is not yet available) |
| status | string | No | Tag status |

### Response 201 Created

Returns the created tag object.

| Field | Type | Description |
|---|---|---|
| id | string | Tag database ID |
| uuid | string | Tag UUID |
| name | string | Tag label |
| description | string | Tag description |
| entity | string | Tagged entity type |
| target | string | Target message ID |
| owner | string | DID of the tag creator |
| messageId | string | HCS message ID where the tag is recorded |
| status | string | Tag publication status (`Draft`, `Published`) |
| createDate | string (ISO 8601) | Creation timestamp |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Missing required permission for the entity type |
| 422 | Validation error |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/tags
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "name": "Verified",
  "description": "Auditor verified this policy",
  "entity": "Policy",
  "target": "1711800000.000000000"
}
```

**Response 201:**
```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Verified",
  "description": "Auditor verified this policy",
  "entity": "Policy",
  "target": "1711800000.000000000",
  "owner": "did:hedera:testnet:zHcDLGFN...",
  "status": "Draft",
  "createDate": "2026-03-30T10:00:00.000Z"
}
```

---

## POST /tags/search

Searches and returns tags for one or more entity targets.

**Authentication:** Required — `TAGS_TAG_READ`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| entity | string | Yes | Entity type to search tags for (e.g., `Policy`, `PolicyDocument`) |
| target | string | No | Single target message ID |
| targets | string[] | No | Multiple target message IDs for batch lookup |

Either `target` or `targets` must be provided.

### Response 200 OK

Returns a tag map object.

| Field | Type | Description |
|---|---|---|
| entity | string | Entity type |
| targets | object | Map of target ID → array of tags |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 422 | Neither target nor targets provided |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/tags/search
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "entity": "Policy",
  "targets": ["1711800000.000000000", "1711800001.000000000"]
}
```

**Response 200:**
```json
{
  "entity": "Policy",
  "targets": {
    "1711800000.000000000": [
      { "id": "tag-id-1", "name": "Verified", "owner": "did:hedera:..." }
    ],
    "1711800001.000000000": []
  }
}
```

---

## DELETE /tags/:uuid

Deletes a tag by its UUID.

**Authentication:** Required — `TAGS_TAG_DELETE` (must be tag owner)

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| uuid | string (UUID) | Yes | Tag UUID to delete |

### Response 200 OK

Returns `true` on successful deletion.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Not the tag owner |
| 404 | Tag not found |
| 500 | Internal server error |

---

## POST /tags/synchronization

Synchronizes tags from the Hedera blockchain for a given entity target (pulls new tags from HCS messages).

**Authentication:** Required — `TAGS_TAG_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| entity | string | Yes | Entity type (e.g., `Policy`) |
| target | string | Yes | Target message ID to synchronize |

### Response 200 OK

Returns the synchronized tag map for the target.

---

## GET /tags/schemas

Returns a paginated list of tag schemas available to the authenticated user.

**Authentication:** Required — `TAGS_TAG_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |

### Response 200 OK

Array of schema objects. Total count in `X-Total-Count` header.

---

## POST /tags/schemas

Creates a new tag schema.

**Authentication:** Required — `TAGS_TAG_CREATE` (Standard Registry)

### Request Body

Schema definition object (JSON Schema format with Guardian metadata).

### Response 201 Created

Returns the created schema.

---

## PUT /tags/schemas/:schemaId

Updates an existing tag schema.

**Authentication:** Required — `TAGS_TAG_UPDATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| schemaId | string | Yes | Schema identifier |

### Response 200 OK

Returns the updated schema.

---

## DELETE /tags/schemas/:schemaId

Deletes a tag schema.

**Authentication:** Required — `TAGS_TAG_DELETE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| schemaId | string | Yes | Schema identifier |

### Response 200 OK

Returns `true` on success.

---

## PUT /tags/schemas/:schemaId/publish

Publishes a tag schema to the Hedera blockchain, making it available to all participants.

**Authentication:** Required — `TAGS_TAG_CREATE` (Standard Registry)

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| schemaId | string | Yes | Schema identifier |

### Response 200 OK

Returns the published schema with `messageId` set.

---

## GET /tags/schemas/published

Returns all published tag schemas visible to the authenticated user.

**Authentication:** Required — `TAGS_TAG_READ`

### Response 200 OK

Array of published schema objects.

### Example

**Request:**
```http
GET /api/v1/tags/schemas/published
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  {
    "id": "schema-id-1",
    "uuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Verification Tag",
    "status": "PUBLISHED",
    "messageId": "1711800000.000000000",
    "owner": "did:hedera:testnet:..."
  }
]
```
