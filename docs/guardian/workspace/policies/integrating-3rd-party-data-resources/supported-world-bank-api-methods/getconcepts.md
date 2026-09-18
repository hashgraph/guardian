---
description: 'API Version: 2.0'
---

# getConcepts

<mark style="color:green;">`GET`</mark> `/v2/sources/{sourceId}/concepts`

Get list of concepts/dimensions for a source.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description |
| -------- | ------ | ----------- |
| sourceId | string | Source ID   |
