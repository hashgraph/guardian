# Settings APIs

Endpoints for retrieving and updating Guardian system settings, such as Hedera operator credentials and IPFS configuration.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/settings` | Returns the current Guardian system settings | Yes |
| `POST` | `/api/v1/settings` | Updates the Guardian system settings | Yes |

## Endpoints

- [Displaying Current Settings](displaying-current-settings.md)
- [Adding Settings](adding-settings.md)

---

## Branding

Endpoints for updating and retrieving the platform branding configuration.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/branding` | Updates the platform branding configuration | Yes |
| `GET` | `/api/v1/branding` | Returns the current platform branding configuration | No |

---

## IPFS File Operations

Endpoints for uploading, retrieving, and deleting files on IPFS.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/ipfs/file` | Uploads a file to IPFS | Yes |
| `POST` | `/api/v1/ipfs/file/direct` | Uploads raw JSON data directly to IPFS | Yes |
| `POST` | `/api/v1/ipfs/file/dry-run/{policyId}` | Uploads a file to IPFS in dry-run mode | Yes |
| `GET` | `/api/v1/ipfs/file/{cid}` | Retrieves a file from IPFS by its CID | Yes |
| `GET` | `/api/v1/ipfs/file/{cid}/dry-run` | Retrieves a file from IPFS in dry-run mode | Yes |
| `DELETE` | `/api/v1/ipfs/file/{cid}` | Removes (unpins) a file from IPFS | Yes |
