# Creates a New Discussion Linked to the Target Document

**`POST /api/v1/policy-comments/{policyId}/{documentId}/discussions`**

Creates a new discussion thread linked to the target document.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE` or `Permissions.POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| `policyId`   | string | Yes      | Policy identifier   |
| `documentId` | string | Yes      | Document identifier |

### Request Body

```json
{
  "title": "Query about facility capacity value",
  "message": "The reported capacity of 500 MWh seems high — please verify."
}
```

| Field     | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| `title`   | string | Yes      | Discussion title or subject  |
| `message` | string | No       | Optional initial message body |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "title": "Query about facility capacity value",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "createDate": "2026-03-30T10:00:00.000Z",
  "commentCount": 0
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Validation error — invalid field values |
| `500 Internal Server Error` | Unexpected server failure |
