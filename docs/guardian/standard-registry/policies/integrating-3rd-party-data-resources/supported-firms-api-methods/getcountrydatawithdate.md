---
description: 'API Version: 4.0.39'
---

# getCountryDataWithDate

<mark style="color:green;">`GET`</mark>`/api/country/csv/{${FIRMSService.secretTokenParamName}}/{source}/{country_code}/{day_range}/{date}`

Get fire detections for a specific country by ISO code with date.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name          | Type        | Description  |
| ------------- | ----------- | ------------ |
| source        | string      | Source       |
| country\_code | number      | Country Code |
| day\_range    | number      | Day Range    |
| date          | date format | Date         |
