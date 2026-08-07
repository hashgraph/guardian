# Synchronization of Tags

**`POST /api/v1/tags/synchronization`**

Synchronizes tags for a target entity with an external Hedera network, refreshing the local cache.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TAGS_TAG_READ`

---

## Request

### Request Body

```json
{
  "entity": "PolicyDocument",
  "target": "1706823489.123456789"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | Yes | Entity type to synchronize tags for. One of: `Schema`, `Policy`, `Token`, `Module`, `Contract`, `PolicyDocument` |
| `target` | string | Yes | Hedera message ID of the target entity |
| `linkedItems` | boolean | No | Whether to include linked items during synchronization |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
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
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Missing or invalid `entity` or `target` field |
| `500 Internal Server Error` | Unexpected server failure |
