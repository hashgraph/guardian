---
description: 'API Version: 2.0'
---

# getIndicatorById

<mark style="color:green;">`GET`</mark>`/v2/indicator/{indicatorId}`

Get metadata about a specific indicator.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name          | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `indicatorId` | string | Indicator code (e.g. NY.GDP.MKTP.CD) |
