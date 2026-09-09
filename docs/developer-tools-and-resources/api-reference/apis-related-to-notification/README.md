# APIs Related to Notifications

Endpoints for retrieving, reading, and deleting Guardian notifications for the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Returns paginated notifications for the current user | Yes |
| `GET` | `/api/v1/notifications/new` | Returns all unread notifications for the current user | Yes |
| `GET` | `/api/v1/notifications/progresses` | Returns active long-running operation progress notifications | Yes |
| `POST` | `/api/v1/notifications/read/all` | Marks all notifications as read | Yes |
| `DELETE` | `/api/v1/notifications/delete/{notificationId}` | Deletes all notifications up to the specified notification | Yes |

## Endpoints

- [Get All Notifications](get-all-notifications.md)
- [Get New Notifications](get-new-notifications.md)
- [Get Progresses](get-progresses.md)
- [Read All Notifications](read-all-notifications.md)
- [Delete Notifications](delete-notifications.md)
