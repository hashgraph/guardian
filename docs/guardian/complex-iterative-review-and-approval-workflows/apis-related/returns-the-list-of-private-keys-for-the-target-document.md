# Returns the List of Private Keys for the Target Document

**`GET /api/v1/policy-comments/{policyId}/{documentId}/keys`**

Returns the list of private keys for the target document, used to decrypt discussion content.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| `policyId`   | string | Yes      | Policy identifier   |
| `documentId` | string | Yes      | Document identifier |

### Query Parameters

| Parameter      | Type   | Required | Default | Description                                        |
|----------------|--------|----------|---------|----------------------------------------------------|
| `discussionId` | string | No       | —       | Filter keys for a specific discussion identifier   |

---

## Response

### Success Response

**Status:** `200 OK`

Returns the private key material as a binary stream.

```
Content-Type: application/octet-stream

<binary key content>
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Key not found for the given document |
| `500 Internal Server Error` | Unexpected server failure |
