# Searching Tags

**`POST /api/v1/tags/search`**

Searches for tags associated with one or more target entities of the given type.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TAGS_TAG_READ`

---

## Request

### Request Body

Search for tags on a single target:

```json
{
  "entity": "PolicyDocument",
  "target": "1706823489.123456789"
}
```

Search for tags on multiple targets:

```json
{
  "entity": "PolicyDocument",
  "targets": [
    "1706823489.123456789",
    "1706823490.987654321"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | Yes | Entity type to search tags for. One of: `Schema`, `Policy`, `Token`, `Module`, `Contract`, `PolicyDocument` |
| `target` | string | No | Single target message ID. Required if `targets` is not provided |
| `targets` | string[] | No | Array of target message IDs. Required if `target` is not provided |
| `linkedItems` | boolean | No | Whether to include linked items in the result |

---

## Response

### Success Response

**Status:** `200 OK`

Returns a map of target IDs to their associated tag data:

```json
{
  "1706823489.123456789": {
    "entity": "PolicyDocument",
    "target": "1706823489.123456789",
    "refreshDate": "2024-02-01T12:00:00.000Z",
    "tags": [
      {
        "id": "63e3e5e8a01b3c001234abcd",
        "name": "example-tag",
        "entity": "PolicyDocument",
        "target": "1706823489.123456789",
        "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
        "status": "Published"
      }
    ]
  }
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Missing or invalid `entity`, `target`, or `targets` field |
| `500 Internal Server Error` | Unexpected server failure |
