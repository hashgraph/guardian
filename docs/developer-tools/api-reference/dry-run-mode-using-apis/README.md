# Dry-Run Mode APIs

Endpoints for running a Guardian policy in dry-run (simulation) mode. Dry-run mode allows testing a policy workflow with virtual users and documents without making any Hedera transactions or persistent changes.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/policies/{policyId}/dry-run/users` | Returns all virtual users for the dry-run instance | Yes |
| `POST` | `/api/v1/policies/{policyId}/dry-run/user` | Creates a new virtual user | Yes |
| `POST` | `/api/v1/policies/{policyId}/dry-run/login` | Logs in as a virtual user | Yes |
| `POST` | `/api/v1/policies/{policyId}/dry-run/restart` | Restarts the policy dry-run execution | Yes |
| `GET` | `/api/v1/policies/{policyId}/dry-run/transactions` | Returns the list of dry-run transactions | Yes |
| `GET` | `/api/v1/policies/{policyId}/dry-run/artifacts` | Returns the list of dry-run artifacts | Yes |
| `GET` | `/api/v1/policies/{policyId}/dry-run/ipfs` | Returns the list of IPFS files created in dry-run | Yes |
| `DELETE` | `/api/v1/policies/{policyId}/draft` | Returns the policy to draft/editing state | Yes |
| `GET` | `/api/v1/policies/{policyId}/save-points` | Returns all savepoints for the dry-run session | Yes |
| `POST` | `/api/v1/policies/{policyId}/save-points` | Creates a new savepoint | Yes |
| `GET` | `/api/v1/policies/{policyId}/save-points/{savepointId}` | Returns the savepoint state | Yes |
| `POST` | `/api/v1/policies/{policyId}/save-points/{savepointId}` | Restores a savepoint | Yes |
| `DELETE` | `/api/v1/policies/{policyId}/save-points/{savepointId}` | Deletes a savepoint | Yes |

## Endpoints

- [Returning All Virtual Users](returning-all-virtual-users.md)
- [Creating Virtual Account](creating-virtual-account.md)
- [Logging Virtual User](logging-virtual-user.md)
- [Restarting the Execution of Policy](restarting-the-execution-of-policy.md)
- [Returns List of Transactions](returns-list-of-transactions.md)
- [Returns List of Artifacts](returns-list-of-artifacts.md)
- [Returns List of IPFS Files](returns-list-of-ipfs-files.md)
- [Returning Policy to Editing](returning-policy-to-editing.md)
- [Running Policy Without Making Any Changes](running-policy-without-making-any-changes.md)
- [Returns Savepoint State](returns-savepoint-state.md)
- [Create Savepoint](create-savepoint.md)
- [Restoring Savepoint](restoring-savepoint.md)
- [Deletes Savepoint](deletes-savepoint.md)
