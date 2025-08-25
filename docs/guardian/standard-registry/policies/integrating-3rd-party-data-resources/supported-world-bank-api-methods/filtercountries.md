---
description: 'API Version: 2.0'
---

# filterCountries

<mark style="color:green;">`GET`</mark>`/v2/country`

Filter countries by aggregates.

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| region      | number | Region code (e.g. LCN)       |
| incomeLevel | number | Income level code (e.g. UMC) |
| lendingType | string | Lending type code (e.g. IBD) |
