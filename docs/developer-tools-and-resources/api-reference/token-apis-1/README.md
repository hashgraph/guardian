# Token APIs

Endpoints for listing Hedera tokens and managing user token associations, KYC status, and freeze status in Guardian.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/tokens` | Returns all tokens; includes balances and statuses for non-Standard-Registry users | Yes |
| `POST` | `/api/v1/tokens/{tokenId}/{username}/associate` | Associates a user with the specified token | Yes |
| `DELETE` | `/api/v1/tokens/{tokenId}/{username}/dissociate` | Disassociates a user from the specified token | Yes |
| `PUT` | `/api/v1/tokens/{tokenId}/{username}/freeze` | Freezes the user's token balance | Yes |
| `PUT` | `/api/v1/tokens/{tokenId}/{username}/unfreeze` | Unfreezes the user's token balance | Yes |
| `PUT` | `/api/v1/tokens/{tokenId}/{username}/grantKyc` | Grants KYC status to the user for the token | Yes |
| `PUT` | `/api/v1/tokens/{tokenId}/{username}/revokeKyc` | Revokes KYC status from the user for the token | Yes |
| `GET` | `/api/v1/tokens/{tokenId}/{username}/info` | Returns token information and status for the specified user | Yes |
| `GET` | `/api/v1/tokens/{tokenId}/serials` | Returns the serial numbers for the specified token | Yes |
| `POST` | `/api/v1/tokens/{tokenId}/transfer` | Transfers tokens to a target account | Yes |

## Endpoints

- [Token Listing](token-listing.md)
- [Token Listing (v1)](token-listing-1.md)
- [Associates the User with Token](associates-the-user-with-token.md)
- [Disassociates the User with Token](disassociates-the-user-with-token.md)
- [Freeze Tokens of a User](freeze-tokens-of-a-user.md)
- [Unfreeze Tokens of a User](unfreeze-tokens-of-a-user.md)
- [Grants KYC for the User](grants-kyc-for-the-user.md)
- [Revoke KYC of the User](revoke-kyc-of-the-user.md)
- [User Info for Selected Token](user-info-for-selected-token.md)
- [Returns Token Serials](returns-token-serials.md)
- [Token Transfer](token-transfer.md)
