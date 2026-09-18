---
description: 'API Version: 2.0'
---

# getMetadata

<mark style="color:green;">`GET`</mark> `/v2/sources/{sourceId}/{conceptId}/{variableIds}/metatypes/{metatypeId}/metadata`

Get metadata values for combinations of concept variables and metatypes.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description                        |
| ----------- | ------ | ---------------------------------- |
| sourceId    | string | Source ID                          |
| conceptId   | string | Concept ID                         |
| variableIds | string | Variable IDs (semicolon-separated) |
| metatypeId  | string | Metatype ID (e.g. incomegroup)     |
