# IPFS APIs

Base URL: `/api/v1/ipfs`
Authentication: All endpoints require Bearer JWT.

Guardian uses IPFS to store Verifiable Credential documents, policy configurations, and schema definitions. Three IPFS providers are supported: `local` (local IPFS node), `filebase` (Filebase S3-backed IPFS), and `web3storage`.

---

## POST /ipfs/file

Uploads a file to IPFS and returns its CID (Content Identifier).

**Authentication:** Required — `IPFS_FILE_CREATE`

### Request Body

Multipart form data with the file binary.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| file | binary | Yes | File content to upload |

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| cid | string | IPFS Content Identifier (CID v1) for the uploaded file |
| url | string | Public gateway URL for accessing the file |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 422 | File missing or invalid |
| 500 | Internal server error or IPFS node unavailable |

### Example

**Request:**
```http
POST /api/v1/ipfs/file
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: multipart/form-data; boundary=---boundary

-----boundary
Content-Disposition: form-data; name="file"; filename="schema.json"
Content-Type: application/json

{ "@context": [...], "type": "VerifiableCredential" ... }
-----boundary--
```

**Response 200:**
```json
{
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "url": "https://ipfs.filebase.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
}
```

---

## POST /ipfs/file/direct

Uploads raw JSON/object data directly to IPFS without multipart encoding.

**Authentication:** Required — `IPFS_FILE_CREATE`

### Request Body

Raw JSON object to store.

### Response 200 OK

Same as `POST /ipfs/file` — returns `cid` and `url`.

### Example

**Request:**
```http
POST /api/v1/ipfs/file/direct
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential"],
  "issuer": "did:hedera:testnet:...",
  "credentialSubject": [{ "field0": "Solar Farm Alpha" }]
}
```

**Response 200:**
```json
{
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "url": "http://localhost:8080/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
}
```

---

## POST /ipfs/file/dry-run/:policyId

Uploads a file to IPFS in **dry-run mode** (test mode). Files uploaded in this mode are associated with the dry-run policy context and may be isolated from production storage.

**Authentication:** Required — `IPFS_FILE_CREATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | ID of the policy being tested in dry-run mode |

### Request Body

Multipart form data with the file binary (same as `POST /ipfs/file`).

### Response 200 OK

Returns `cid` and `url` same as standard upload.

---

## GET /ipfs/file/:cid

Retrieves a file from IPFS by its CID.

**Authentication:** Required — `IPFS_FILE_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| cid | string | Yes | IPFS Content Identifier of the file to retrieve |

### Response 200 OK

Returns the file binary content with appropriate `Content-Type` header.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | File not found on IPFS |
| 500 | IPFS node unavailable or timeout |

### Example

**Request:**
```http
GET /api/v1/ipfs/file/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

## GET /ipfs/file/:cid/dry-run

Retrieves a file from IPFS in dry-run mode context.

**Authentication:** Required — `IPFS_FILE_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| cid | string | Yes | IPFS Content Identifier |

---

## DELETE /ipfs/file/:cid

Removes a file from IPFS (unpins it from the local/configured node).

**Authentication:** Required — `IPFS_FILE_DELETE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| cid | string | Yes | IPFS Content Identifier of the file to remove |

### Response 200 OK

Returns `true` on success.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | File not found |
| 500 | Internal server error |

---

## IPFS Provider Configuration

IPFS provider is configured via the `IPFS_PROVIDER` environment variable in the service configuration. Valid values: `local`, `filebase`, `web3storage`. See [Setting up environment parameters](../guardian/readme/getting-started/installation/setting-up-environment-parameters.md) for details.

| Provider | Description | Required Config |
|---|---|---|
| `local` | Local IPFS daemon | `IPFS_NODE_ADDRESS` |
| `filebase` | Filebase S3-backed IPFS | `IPFS_STORAGE_KEY` |
| `web3storage` | Web3.Storage | `IPFS_STORAGE_KEY`, `IPFS_STORAGE_PROOF` |
