# APIs Related to Roles and Permissions

Guardian uses a role-based access control (RBAC) system. Standard Registry users create custom roles with specific permission sets, then assign those roles to users within their organization. Delegation support also allows ordinary users with the appropriate rights to manage role and policy assignments on behalf of peers.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`) — obtain via `POST /api/v1/accounts/login`.

---

## Endpoint Index

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`GET`** | `/api/v1/permissions` | Returns the full list of available system-level permissions | Yes |
| **`GET`** | `/api/v1/permissions/roles` | Returns a paginated list of roles | Yes |
| **`POST`** | `/api/v1/permissions/roles` | Creates a new custom role | Yes |
| **`PUT`** | `/api/v1/permissions/roles/{id}` | Updates an existing role's configuration | Yes |
| **`DELETE`** | `/api/v1/permissions/roles/{id}` | Deletes a role by ID | Yes |
| **`POST`** | `/api/v1/permissions/roles/default` | Sets a role as the default for new users | Yes |
| **`GET`** | `/api/v1/permissions/users` | Returns a paginated list of manageable users | Yes |
| **`GET`** | `/api/v1/permissions/users/{username}` | Returns a user's roles, permissions, and assigned policies | Yes |
| **`PUT`** | `/api/v1/permissions/users/{username}` | Assigns roles to a user (Standard Registry) | Yes |
| **`GET`** | `/api/v1/permissions/users/{username}/policies` | Returns policies accessible to a user | Yes |
| **`POST`** | `/api/v1/permissions/users/{username}/policies/assign` | Assigns or unassigns policies to a user (Standard Registry) | Yes |
| **`PUT`** | `/api/v1/permissions/users/{username}/delegate` | Delegates roles to a user (ordinary users) | Yes |
| **`POST`** | `/api/v1/permissions/users/{username}/policies/delegate` | Delegates policy access to a user (ordinary users) | Yes |

---

## Endpoints

- [Returns List of All Permissions](returns-list-of-all-permissions.md)
- [Returns List of All Roles](returns-list-of-all-roles.md)
- [Creates a New Role](creates-a-new-role.md)
- [Updates Role Configuration](updates-role-configuration.md)
- [Deletes Role](deletes-role.md)
- [Setting Default Role](setting-default-role.md)
- [Returns List of All Users](returns-list-of-all-users-for-whom-the-current-user-can-change-the-role.md)
- [Retrieves User Information (Roles, Permissions, Assigned Policies)](retrieves-information-about-the-user-roles-permissions-assigned-policies.md)
- [Updates User Roles (Standard Registry)](updates-user-roles-only-sr.md)
- [Returns List of All Policies for a User](returns-list-of-all-policies.md)
- [Assigns Policies to a User (Standard Registry)](assigns-policies-to-a-user-only-sr.md)
- [Delegates User Roles (Ordinary Users)](updates-user-roles-for-ordinary-uses.md)
- [Delegates Policies to a User (Ordinary Users)](assigns-policies-to-a-user-for-ordinary-users.md)
