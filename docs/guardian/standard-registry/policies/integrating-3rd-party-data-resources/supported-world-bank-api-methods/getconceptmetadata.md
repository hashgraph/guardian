---
description: 'API Version: 2.0'
---

# getConceptMetadata

<mark style="color:green;">`GET`</mark> `/v2/sources/{sourceId}/concepts/{conceptId}/metadata`

Get metadata (metatypes) for specific concept.

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
