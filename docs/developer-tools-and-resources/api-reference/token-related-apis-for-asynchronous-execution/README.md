# Token APIs — Asynchronous Execution

The Token async APIs provide asynchronous endpoints for token creation, update, deletion, association, and KYC/freeze management. All endpoints return `202 Accepted` with a `taskId`. Poll `GET /tasks/{taskId}` to retrieve the result.

**Base URL:** `/api/v1/tokens/push`

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`POST`** | `/tokens/push` | Creates a new token (async) | Yes |
| **`PUT`** | `/tokens/push` | Updates an existing token (async) | Yes |
| **`DELETE`** | `/tokens/push/{tokenId}` | Deletes a token (async) | Yes |
| **`POST`** | `/tokens/push/delete-multiple` | Deletes multiple tokens (async) | Yes |
| **`PUT`** | `/tokens/push/{tokenId}/associate` | Associates the user with the token (async) | Yes |
| **`PUT`** | `/tokens/push/{tokenId}/dissociate` | Disassociates the user from the token (async) | Yes |
| **`PUT`** | `/tokens/push/{tokenId}/{username}/grant-kyc` | Sets the KYC flag for the user (async) | Yes |
| **`PUT`** | `/tokens/push/{tokenId}/{username}/revoke-kyc` | Unsets the KYC flag for the user (async) | Yes |
| **`PUT`** | `/tokens/push/{tokenId}/{username}/freeze` | Freezes token transfers for the user (async) | Yes |
| **`PUT`** | `/tokens/push/{tokenId}/{username}/unfreeze` | Unfreezes token transfers for the user (async) | Yes |

---

## Endpoint Details

* [Token Creation](token-creation.md)
* [Updating a Token](updating-a-token.md)
* [Deleting a Token](deleting-a-token.md)
* [Deleting Multiple Tokens](deleting-multiple-tokens.md)
* [Associating User with the Hedera Token](associating-user-with-the-hedera-token.md)
* [Disassociating User from the Hedera Token](disassociating-user-with-the-hedera-token.md)
* [Setting KYC for the User](setting-kyc-for-the-user.md)
* [Unsetting KYC for the User](unsetting-kyc-for-the-user.md)
* [Freezing Tokens of a User](freezing-tokens-of-a-user.md)
* [Unfreezing Tokens of a User](unfreezing-tokens-of-a-user.md)
