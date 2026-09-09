# Retrieves and Decrypts the File Associated with the Discussion from IPFS

**`GET /api/v1/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments/file/{cid}`**

Retrieves and decrypts the file associated with the discussion from IPFS.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE`, `Permissions.POLICIES_POLICY_MANAGE`, or `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter      | Type   | Required | Description                     |
|----------------|--------|----------|---------------------------------|
| `policyId`     | string | Yes      | Policy identifier               |
| `documentId`   | string | Yes      | Document identifier             |
| `discussionId` | string | Yes      | Discussion identifier           |
| `cid`          | string | Yes      | IPFS CID of the encrypted file  |

---

## Response

### Success Response

**Status:** `200 OK`

Returns the decrypted file as a binary stream.

```
Content-Type: application/octet-stream

<binary file content>
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | File not found in IPFS for the given CID |
| `500 Internal Server Error` | Unexpected server failure |
