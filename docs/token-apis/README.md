# Token APIs

The Token APIs provide endpoints for managing Hedera tokens, including creation, association, KYC management, and freeze controls.

**Base URL:** `/api/v1/tokens`

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`GET`** | `/tokens/` | Returns list of all tokens | Yes |
| **`GET`** | `/tokens/{tokenId}` | Returns a single token by ID | Yes |
| **`POST`** | `/tokens/` | Creates a new token | Yes |
| **`PUT`** | `/tokens/` | Updates an existing token | Yes |
| **`PUT`** | `/tokens/{tokenId}/associate` | Associates the user with the token | Yes |
| **`PUT`** | `/tokens/{tokenId}/dissociate` | Disassociates the user from the token | Yes |
| **`PUT`** | `/tokens/{tokenId}/{username}/grant-kyc` | Sets the KYC flag for the user | Yes |
| **`PUT`** | `/tokens/{tokenId}/{username}/revoke-kyc` | Unsets the KYC flag for the user | Yes |
| **`PUT`** | `/tokens/{tokenId}/{username}/freeze` | Freezes token transfers for the user | Yes |
| **`PUT`** | `/tokens/{tokenId}/{username}/unfreeze` | Unfreezes token transfers for the user | Yes |
| **`GET`** | `/tokens/{tokenId}/{username}/info` | Returns token status info for the user | Yes |

---

## Endpoint Details

* [Token Listing](token-listing.md)
* [Return Token by ID](returns-token-by-id.md)
* [Creation of a Token](token-listing-1.md)
* [Updating a Token](updating-a-token.md)
* [Associates the User with Token](associates-the-user-with-token.md)
* [Disassociates the User from Token](disassociates-the-user-with-token.md)
* [Grants KYC for the User](grants-kyc-for-the-user.md)
* [Revoke KYC of the User](revoke-kyc-of-the-user.md)
* [Freeze Tokens of a User](freeze-tokens-of-a-user.md)
* [Unfreeze Tokens of a User](unfreeze-tokens-of-a-user.md)
* [User Info for Selected Token](user-info-for-selected-token.md)
