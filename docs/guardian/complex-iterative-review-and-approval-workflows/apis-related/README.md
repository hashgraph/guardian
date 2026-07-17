---
icon: webhook
---

# APIs Related to Complex Iterative Review and Approval Workflows

These APIs enable collaborative document review within Guardian policies. Users can create discussion threads on policy documents, post messages, attach encrypted files, and inspect document relationships and schemas — all scoped to a specific policy and document.

**Authentication:** All endpoints require a Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /api/v1/accounts/login`.

---

## Endpoint Index

### Policy Comments (`/api/v1/policy-comments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`GET`** | `/policy-comments/{policyId}/{documentId}/users` | Returns users with access to the document | Yes |
| **`GET`** | `/policy-comments/{policyId}/{documentId}/relationships` | Returns documents linked to the target document | Yes |
| **`GET`** | `/policy-comments/{policyId}/{documentId}/schemas` | Returns schemas applicable to the target document | Yes |
| **`GET`** | `/policy-comments/{policyId}/{documentId}/discussions` | Returns discussion threads for the target document | Yes |
| **`POST`** | `/policy-comments/{policyId}/{documentId}/discussions` | Creates a new discussion thread | Yes |
| **`POST`** | `/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments` | Creates a new message in a discussion | Yes |
| **`POST`** | `/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments/search` | Returns paginated messages for a discussion | Yes |
| **`GET`** | `/policy-comments/{policyId}/{documentId}/comments/count` | Returns the total message count for a document | Yes |
| **`POST`** | `/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments/file` | Encrypts and uploads a file to IPFS | Yes |
| **`GET`** | `/policy-comments/{policyId}/{documentId}/discussions/{discussionId}/comments/file/{cid}` | Retrieves and decrypts a file from IPFS | Yes |
| **`GET`** | `/policy-comments/{policyId}/{documentId}/keys` | Returns private keys for the target document | Yes |

### Policy Repository (`/api/v1/policy-repository`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`GET`** | `/policy-repository/{policyId}/users` | Returns user names present in the policy | Yes |
| **`GET`** | `/policy-repository/{policyId}/schemas` | Returns schemas present in the policy | Yes |
| **`GET`** | `/policy-repository/{policyId}/documents` | Returns paginated documents in the policy | Yes |

---

## Endpoints

### Policy Comments

- [Returns the List of Users with Access to a Document](returns-the-list-of-user-names-which-are-present-in-the-target-policy-and-have-access-to-the-target.md)
- [Returns the List of Documents Linked with the Target Document](returns-the-list-of-documents-linked-with-the-target-document.md)
- [Returns the List of Schemas for the Target Document](returns-the-list-of-schemas-for-the-target-document.md)
- [Returns the List of Discussions for the Target Document](returns-the-list-of-discussions-for-the-target-document.md)
- [Creates a New Discussion Linked to the Target Document](creates-a-new-discussion-linked-to-the-target-document.md)
- [Creates a New Message in the Target Discussion](creates-a-new-message-in-the-target-discussion.md)
- [Returns the List of Messages for the Target Discussion](returns-the-list-of-messages-for-the-target-discussion.md)
- [Returns the Count of Messages in the Target Discussion](returns-the-count-of-the-messages-in-the-target-discussion.md)
- [Encrypts and Loads the File into IPFS Linked to the Target Discussion](encrypts-and-loads-the-file-into-ipfs-linked-to-the-target-discussion.md)
- [Retrieves and Decrypts the File Associated with the Discussion from IPFS](retrieves-and-decrypts-the-file-associated-with-the-discussion-from-ipfs.md)
- [Returns the List of Private Keys for the Target Document](returns-the-list-of-private-keys-for-the-target-document.md)

### Policy Repository

- [Returns the List of User Names Present in the Policy](returns-the-list-of-user-names-which-are-present-in-the-policy.md)
- [Returns the List of Schemas Present in the Target Policy](returns-the-list-of-schemas-present-in-the-target-policy.md)
- [Returns the List of Documents in the Target Policy](returns-the-list-of-documents-in-the-target-policy.md)
