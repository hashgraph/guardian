---
description: 'API Version: 2.0'
---

# searchMetadata

<mark style="color:green;">`GET`</mark>` ``/v2/sources/{sourceId}/search/{searchTerm}`

Search metadata by keyword.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name       | Type   | Description               |
| ---------- | ------ | ------------------------- |
| sourceId   | string | Source ID                 |
| searchTerm | string | Search term (URL-encoded) |
