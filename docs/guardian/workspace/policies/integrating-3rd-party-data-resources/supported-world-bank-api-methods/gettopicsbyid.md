---
description: 'API Version: 2.0'
---

# getTopicsById

<mark style="color:green;">`GET`</mark>`/v2/topic/{topicIds}`

Get metadata about one or more topics.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description                      |
| -------- | ------ | -------------------------------- |
| topicIds | string | Topic ID(s), semicolon‑separated |
