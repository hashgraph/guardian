---
description: 'API Version: 2.0'
---

# getConceptVariables

<mark style="color:green;">`GET`</mark>`/v2/sources/{sourceId}/:{conceptId}/data`

Retrieve variables within a concept (e.g. country codes for Country concept).

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name      | Type   | Description |
| --------- | ------ | ----------- |
| sourceId  | string | Source ID   |
| conceptId | string | Concept ID  |
