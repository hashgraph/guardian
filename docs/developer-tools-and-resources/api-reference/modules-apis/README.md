# Modules APIs

Endpoints for creating, managing, importing, exporting, and publishing Guardian policy modules. Modules are reusable policy components that can be shared across policies.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required for write operations.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/modules` | Returns all modules | Yes |
| `POST` | `/api/v1/modules` | Creates a new module | Yes |
| `GET` | `/api/v1/modules/{uuid}` | Returns the module configuration | Yes |
| `PUT` | `/api/v1/modules/{uuid}` | Updates the module configuration | Yes |
| `DELETE` | `/api/v1/modules/{uuid}` | Deletes a module | Yes |
| `GET` | `/api/v1/modules/{uuid}/export/file` | Exports a module as a ZIP file | Yes |
| `GET` | `/api/v1/modules/{uuid}/export/message` | Returns the module Hedera message ID | Yes |
| `POST` | `/api/v1/modules/import/file` | Imports a module from a ZIP file | Yes |
| `POST` | `/api/v1/modules/import/message` | Imports a module from an IPFS message ID | Yes |
| `POST` | `/api/v1/modules/import/file/preview` | Previews a module from a ZIP file | Yes |
| `POST` | `/api/v1/modules/import/message/preview` | Previews a module from an IPFS message ID | Yes |
| `PUT` | `/api/v1/modules/{uuid}/publish` | Publishes a module to IPFS | Yes |
| `POST` | `/api/v1/modules/{uuid}/validate` | Validates a module configuration | Yes |
| `GET` | `/api/v1/modules/menu` | Returns the available modules menu | Yes |

## Endpoints

- [Returns All Modules](returns-all-modules.md)
- [Creating New Module](creating-new-module.md)
- [Retrieves Module Configuration](retrieves-module-configuration.md)
- [Updates Module Configuration](updates-module-configuration.md)
- [Delete the Module](delete-the-module.md)
- [Exporting Module in ZIP Format](exporting-module-in-zip-format.md)
- [Returns Hedera ID for Specific Module](returns-hedera-id-for-specific-module.md)
- [Import Module from ZIP File](import-module-from-zip-file.md)
- [Import Module from IPFS](import-module-from-ipfs.md)
- [Preview Module from ZIP File](preview-module-from-zip-file.md)
- [Preview Module from IPFS](preview-module-from-ipfs.md)
- [Publishing Module onto IPFS](publishing-module-onto-ipfs.md)
- [Validates Module](validates-module.md)
- [Returns Module Menu](returns-module-menu.md)
