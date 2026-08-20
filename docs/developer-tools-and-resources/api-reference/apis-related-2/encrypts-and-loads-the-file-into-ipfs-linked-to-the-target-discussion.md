# Encrypts and Loads the File into IPFS Linked to the Target Discussion

**`POST /api/v1/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments/file`**

Encrypts and uploads a file to IPFS, attaching it to the target discussion thread.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE` or `Permissions.POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter      | Type   | Required | Description           |
|----------------|--------|----------|-----------------------|
| `policyId`     | string | Yes      | Policy identifier     |
| `documentId`   | string | Yes      | Document identifier   |
| `discussionId` | string | Yes      | Discussion identifier |

### Request Body

Binary file data. The request body must not be empty.

```
Content-Type: application/octet-stream

<binary file content>
```

---

## Response

### Success Response

**Status:** `201 Created`

Returns the IPFS CID of the uploaded file as a JSON string.

```json
"bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | File could not be uploaded to IPFS |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Request body is empty |
| `500 Internal Server Error` | Unexpected server failure |
