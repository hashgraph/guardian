# Tools APIs

Endpoints for creating, managing, importing, exporting, and publishing Guardian policy tools. Tools are reusable policy components that encapsulate specific functionality.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required for write operations.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/tools` | Returns all tools | Yes |
| `POST` | `/api/v1/tools` | Creates a new tool | Yes |
| `GET` | `/api/v1/tools/{id}` | Returns the tool configuration | Yes |
| `PUT` | `/api/v1/tools/{id}` | Updates the tool configuration | Yes |
| `DELETE` | `/api/v1/tools/{id}` | Deletes a tool | Yes |
| `GET` | `/api/v1/tools/{id}/export/file` | Exports a tool as a ZIP file | Yes |
| `GET` | `/api/v1/tools/{id}/export/message` | Returns the tool Hedera message ID | Yes |
| `POST` | `/api/v1/tools/import/file` | Imports a tool from a ZIP file | Yes |
| `POST` | `/api/v1/tools/import/message` | Imports a tool from an IPFS message ID | Yes |
| `POST` | `/api/v1/tools/import/file/preview` | Previews a tool from a ZIP file | Yes |
| `POST` | `/api/v1/tools/import/message/preview` | Previews a tool from an IPFS message ID | Yes |
| `PUT` | `/api/v1/tools/{id}/publish` | Publishes a tool to IPFS | Yes |
| `POST` | `/api/v1/tools/push` | Creates a new tool asynchronously | Yes |
| `POST` | `/api/v1/tools/{id}/validate` | Validates a tool | Yes |
| `GET` | `/api/v1/tools/menu/all` | Returns the tools available in the menu | Yes |

## Endpoints

- [Returns List of Tools](returns-list-of-tools.md)
- [Returns List of Tools (v1)](returns-list-of-tools-1.md)
- [Creating New Tool](creating-new-tool.md)
- [Creating New Tool Asynchronously](creating-new-tool-asynchronously.md)
- [Retrieves Tool Configuration](retrieves-tool-configuration.md)
- [Updates Tool Configuration](updates-tool-configuration.md)
- [Deletes the Tool](deletes-the-tool.md)
- [Returns Tools and Its Artifacts in ZIP Format](returns-tools-and-its-artifacts-in-zip-format.md)
- [Retrieves Hedera Message ID](retrieves-hedera-message-id.md)
- [Importing Tool from a ZIP File](importing-tool-from-a-zip-file.md)
- [Importing Tool from ZIP](importing-tool-from-zip.md)
- [Imported Tool from IPFS](imported-tool-from-ipfs.md)
- [Previews Imported Tool from ZIP](previews-imported-tool-from-zip.md)
- [Previews Imported Tool from IPFS](previews-imported-tool-from-ipfs.md)
- [Importing Tool from a ZIP File Asynchronously](importing-tool-from-a-zip-file-asynchronously.md)
- [Imports New Tool from ZIP Asynchronously](imports-new-tool-from-zip-asynchronously.md)
- [Imports New Tool from IPFS Asynchronously](imports-new-tool-from-ipfs-asynchronously.md)
- [Publishes Tool onto IPFS](publishes-tool-onto-ipfs.md)
- [Publishes Tool into IPFS Asynchronously](publishes-tool-into-ipfs-asynchronously.md)
- [Validates Selected Tool](validates-selected-tool.md)
- [Return Policy to Editing](return-policy-to-editing.-only-users-with-the-standard-registry-can-make-request.md)
- [Run Policy Without Making Any Persistent Changes](run-policy-without-making-any-persistent-changes-or-executing-transaction..md)
