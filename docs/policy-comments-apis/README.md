# Policy Comments APIs

Base URL: `/api/v1/policy-comments`
Authentication: All endpoints require Bearer JWT.

The Policy Comments API enables collaborative review discussions on policy documents. Users can create discussion threads on specific documents, post messages, and attach encrypted files — all within the context of a policy and document.

---

## GET /policy-comments/:policyId/:documentId/users

Returns all users who have access to the target document within the policy.

**Authentication:** Required

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |
| documentId | string | Yes | Document identifier |

### Response 200 OK

Array of user objects with access to the document.

| Field | Type | Description |
|---|---|---|
| username | string | User login name |
| did | string | User DID |
| role | string | User's role in the policy |

---

## GET /policy-comments/:policyId/:documentId/relationships

Returns all documents linked to (related to) the target document.

**Authentication:** Required

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |
| documentId | string | Yes | Document identifier |

### Response 200 OK

Array of related document objects with their relationship types.

---

## GET /policy-comments/:policyId/:documentId/schemas

Returns the list of schemas applicable to the target document within the policy.

**Authentication:** Required

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |
| documentId | string | Yes | Document identifier |

### Response 200 OK

Array of schema objects.

---

## GET /policy-comments/:policyId/:documentId/discussions

Returns all discussion threads for the target document.

**Authentication:** Required

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |
| documentId | string | Yes | Document identifier |

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |

### Response 200 OK

Array of discussion thread objects. Total count in `X-Total-Count` header.

| Field | Type | Description |
|---|---|---|
| id | string | Discussion ID |
| title | string | Discussion title |
| owner | string | DID of discussion creator |
| createDate | string | Creation timestamp |
| commentCount | number | Number of comments in this thread |
| lastComment | object | Most recent comment preview |

### Example

**Request:**
```http
GET /api/v1/policy-comments/63e3e5e8a01b3c001234abcd/doc-id-123/discussions
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  {
    "id": "discussion-id-1",
    "title": "Please review field values",
    "owner": "did:hedera:testnet:...",
    "createDate": "2026-03-30T10:00:00.000Z",
    "commentCount": 3
  }
]
```

---

## POST /policy-comments/:policyId/:documentId/discussions

Creates a new discussion thread on a document.

**Authentication:** Required

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |
| documentId | string | Yes | Document identifier |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| title | string | Yes | Discussion title / subject |
| message | string | No | Initial message body |

### Response 201 Created

Returns the created discussion object.

### Example

**Request:**
```http
POST /api/v1/policy-comments/63e3e5e8a01b3c001234abcd/doc-id-123/discussions
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "title": "Query about facility capacity value",
  "message": "The reported capacity of 500 MWh seems high — please verify."
}
```

---

## POST /policy-comments/:policyId/:documentId/discussions/:discussionId/comments

Adds a new comment/message to an existing discussion thread.

**Authentication:** Required

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |
| documentId | string | Yes | Document identifier |
| discussionId | string | Yes | Discussion thread identifier |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| message | string | Yes | Comment text content |
| mentionedUsers | string[] | No | Array of user DIDs to mention/notify |

### Response 201 Created

Returns the created comment object.

---

## POST /policy-comments/:policyId/:documentId/discussions/:discussionId/comments/search

Returns paginated comments for a discussion with optional filters.

**Authentication:** Required

### Path Parameters

Same as above.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Page number |
| pageSize | number | No | Items per page |
| from | string | No | Filter comments from this timestamp (ISO 8601) |

### Response 200 OK

Array of comment objects with total count in `X-Total-Count`.

| Field | Type | Description |
|---|---|---|
| id | string | Comment ID |
| message | string | Comment text |
| owner | string | Author DID |
| createDate | string | Creation timestamp |
| files | array | Attached encrypted file references |

---

## GET /policy-comments/:policyId/:documentId/comments/count

Returns the total number of comments across all discussions for a document.

**Authentication:** Required

### Response 200 OK

```json
{ "count": 12 }
```

---

## POST /policy-comments/:policyId/:documentId/discussions/:discussionId/comments/file

Encrypts and uploads a file to IPFS, attaching it to the discussion thread.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

### Response 201 Created

Returns the uploaded file reference with CID.

---

## GET /policy-comments/:policyId/:documentId/discussions/:discussionId/comments/file/:cid

Retrieves and decrypts a file attached to a discussion.

**Authentication:** Required

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |
| documentId | string | Yes | Document identifier |
| discussionId | string | Yes | Discussion identifier |
| cid | string | Yes | IPFS CID of the file |

### Response 200 OK

Returns the decrypted file binary.
