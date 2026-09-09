# Creating Tag

**`POST /api/v1/tags`**

Creates a new tag and associates it with the specified entity.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TAGS_TAG_CREATE`

---

## Request

### Request Body

```json
{
  "name": "example-tag",
  "description": "A sample tag",
  "entity": "PolicyDocument",
  "target": "1706823489.123456789",
  "localTarget": "63e3e5e8a01b3c001234abcd",
  "uri": "https://example.com/tag-schema"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable tag name |
| `description` | string | No | Optional tag description |
| `entity` | string | Yes | Entity type the tag belongs to (e.g. `Schema`, `Policy`, `Token`, `Module`, `Contract`, `PolicyDocument`) |
| `target` | string | Yes | Hedera message ID of the target entity |
| `localTarget` | string | No | Local database ID of the target entity |
| `uri` | string | No | URI of the tag schema |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "example-tag",
  "description": "A sample tag",
  "entity": "PolicyDocument",
  "target": "1706823489.123456789",
  "localTarget": "63e3e5e8a01b3c001234abcd",
  "uri": "https://example.com/tag-schema",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "status": "Draft"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Malformed request body |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
