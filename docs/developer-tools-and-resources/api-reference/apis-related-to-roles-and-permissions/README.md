# APIs Related to Roles and Permissions

Guardian uses a role-based access control (RBAC) system. Standard Registry users create custom roles with specific permission sets, then assign those roles to users within their organization. Delegation support also allows ordinary users with the appropriate rights to manage role and policy assignments on behalf of peers.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`) — obtain via `POST /api/v1/accounts/login`.

---

For the current endpoint list and schemas, see the [Permissions reference](https://guardian.hedera.com/api-reference-guardian/identity-and-access/permissions).
