# Themes APIs

Endpoints for creating, updating, importing, exporting, and deleting visual themes used in the Guardian policy editor UI.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/themes` | Returns all themes for the current user | Yes |
| `POST` | `/api/v1/themes` | Creates a new theme | Yes |
| `PUT` | `/api/v1/themes/{themeId}` | Updates a theme configuration | Yes |
| `DELETE` | `/api/v1/themes/{themeId}` | Deletes a theme | Yes |
| `GET` | `/api/v1/themes/{themeId}/export/file` | Exports a theme as a ZIP file | Yes |
| `POST` | `/api/v1/themes/import/file` | Imports a theme from a ZIP file | Yes |

## Endpoints

- [Returning All Themes](returning-all-themes.md)
- [Creating Theme](creating-theme.md)
- [Updating Theme Configuration](updating-theme-configuration.md)
- [Deleting Theme](deleting-theme.md)
- [Returning ZIP File Containing Themes](returning-zip-file-containing-themes.md)
- [Importing Theme](importing-theme.md)
