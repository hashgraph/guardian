# getTasksForAsset

GET /asset/:asset\_id/tasks

Get tasks for asset

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description      |
| ----------- | ------ | ---------------- |
| asset\_Id   | string | Asset ID         |
| page\[size] | number | size of the page |
