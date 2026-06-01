# Retirement Contract APIs

Endpoints for creating and managing Guardian retirement contracts, retire pools, wipe requests, and associated administrators.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/contracts` | Returns all retirement contracts | Yes |
| `POST` | `/api/v1/contracts` | Creates a new retirement contract | Yes |
| `POST` | `/api/v1/contracts/import` | Imports an existing retirement contract | Yes |
| `DELETE` | `/api/v1/contracts/{contractId}` | Removes a retirement contract | Yes |
| `GET` | `/api/v1/contracts/{contractId}/permissions` | Returns permissions for the contract | Yes |
| `POST` | `/api/v1/contracts/retire/{contractId}/admin/{hederaId}` | Adds a retire administrator | Yes |
| `DELETE` | `/api/v1/contracts/retire/{contractId}/admin/{hederaId}` | Removes a retire administrator | Yes |
| `GET` | `/api/v1/contracts/retire/pools` | Returns all retire pools | Yes |
| `POST` | `/api/v1/contracts/retire/pools` | Sets retire pools | Yes |
| `DELETE` | `/api/v1/contracts/retire/pools` | Deletes retire pools | Yes |
| `DELETE` | `/api/v1/contracts/retire/pools/{poolId}` | Unsets a retire pool | Yes |
| `POST` | `/api/v1/contracts/retire/pools/sync` | Synchronizes retire pools | Yes |
| `GET` | `/api/v1/contracts/retire/requests` | Returns all retire requests | Yes |
| `DELETE` | `/api/v1/contracts/retire/requests` | Deletes all retire requests | Yes |
| `POST` | `/api/v1/contracts/retire/requests/{requestId}/approve` | Approves a retire request | Yes |
| `DELETE` | `/api/v1/contracts/retire/requests/{requestId}` | Cancels a retire request | Yes |
| `POST` | `/api/v1/contracts/retire` | Retires tokens | Yes |
| `GET` | `/api/v1/contracts/retire` | Returns all retired VCs | Yes |
| `GET` | `/api/v1/contracts/wipe/requests` | Returns all wipe requests | Yes |
| `POST` | `/api/v1/contracts/wipe/requests/{requestId}/approve` | Approves wipe requests | Yes |
| `DELETE` | `/api/v1/contracts/wipe/requests` | Clears wipe requests | Yes |
| `DELETE` | `/api/v1/contracts/wipe/requests/{requestId}` | Rejects wipe requests | Yes |
| `POST` | `/api/v1/contracts/{contractId}/wipe/admin/{hederaId}` | Adds a wipe administrator | Yes |
| `DELETE` | `/api/v1/contracts/{contractId}/wipe/admin/{hederaId}` | Removes a wipe administrator | Yes |
| `POST` | `/api/v1/contracts/{contractId}/wipe/manager/{hederaId}` | Adds a wipe manager | Yes |
| `DELETE` | `/api/v1/contracts/{contractId}/wipe/manager/{hederaId}` | Removes a wipe manager | Yes |
| `POST` | `/api/v1/contracts/{contractId}/wipe/wiper/{hederaId}` | Adds a wipe wiper | Yes |
| `DELETE` | `/api/v1/contracts/{contractId}/wipe/wiper/{hederaId}` | Removes a wipe wiper | Yes |
| `POST` | `/api/v1/contracts/{contractId}/wipe/requests/enable` | Enables wipe requests | Yes |
| `POST` | `/api/v1/contracts/{contractId}/wipe/requests/disable` | Disables wipe requests | Yes |

## Endpoints

- [Returns All Contracts](returns-all-contracts.md)
- [Creating New Contract](creating-new-contract.md)
- [Importing New Contract](importing-new-contract.md)
- [Removing Contract](removing-contract.md)
- [Get Contract Permissions](get-contract-permissions.md)
- [Adding Retire Admin](adding-retire-admin.md)
- [Removing Retire Admin](removing-retire-admin.md)
- [Returning List of All Retire Pools](returning-list-of-all-retire-pools.md)
- [Setting Retire Pools](setting-retire-pools.md)
- [Deleting Retire Pools](deleting-retire-pools.md)
- [Unsetting Retire Pool](unsetting-retire-pool.md)
- [Syncing Retire Pools](syncing-retire-pools.md)
- [Returning List of All Retire Requests](returning-list-of-all-retire-requests.md)
- [Deleting Retire Requests](deleting-retire-requests.md)
- [Approving Retire Request](approving-retire-request.md)
- [Cancelling Retire Request](cancelling-retire-request.md)
- [Retiring Tokens](retiring-tokens.md)
- [Returning All Retired VCs](returning-all-retired-vcs.md)
- [Returns a List of All Wipe Requests](returns-a-list-of-all-wipe-requests.md)
- [Approving Wipe Requests](approving-wipe-requests.md)
- [Clearing Wipe Requests](clearing-wipe-requests.md)
- [Rejecting Wipe Requests](rejecting-wipe-requests.md)
- [Adding Wipe Admin](adding-wipe-admin.md)
- [Removing Wipe Admin](removing-wipe-admin.md)
- [Adding Wipe Manager](adding-wipe-manager.md)
- [Removing Wipe Manager](removing-wipe-manager.md)
- [Adding Wipe Wiper](adding-wipe-wiper.md)
- [Removing Wipe Wiper](removing-wipe-wiper.md)
- [Enabling Wipe Requests](enabling-wipe-requests.md)
- [Disabling Wipe Requests](disabling-wipe-requests.md)
- [Adding Wipe for Specific Token](adding-wipe-for-specific-token.md)
- [Deleting Wipe Request for Hedera Account](deleting-wipe-request-for-hedera-account.md)
- [Get Retirement VCs from Indexer](get-retirement-vcs-from-indexer.md)
- [Remove Wipe Request for Specific Token](remove-wipe-request-for-specific-token.md)
- [Unsetting Retire Request](unsetting-retire-request.md)
