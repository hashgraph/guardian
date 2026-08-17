---
description: 'API Version: 4.0.39'
---

# getAreaDataWithDate

<mark style="color:green;">`GET`</mark>` ``/api/area/csv/{${FIRMSService.secretTokenParamName}}/{source}/{area_coordinates}/{day_range}/{date}`

Get fire detections for specified bounding box area with date.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name              | Type   | Description      |
| ----------------- | ------ | ---------------- |
| source            | string | Source           |
| area\_coordinates | number | Area Coordinates |
| day\_range        | number | Day Range        |
