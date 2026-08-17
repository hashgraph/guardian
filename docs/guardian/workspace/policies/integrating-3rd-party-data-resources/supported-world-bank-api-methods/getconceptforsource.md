---
description: 'API Version: 2.0'
---

# getConceptForSource

<mark style="color:green;">`Get`</mark>`/v2/sources/{sourceId}/concepts/{conceptId}/data`

Retrieve list of concepts (dimensions) for a source.

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
