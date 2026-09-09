---
description: 'API Version: 2.0'
---

# getCountryByCode

<mark style="color:green;">`GET`</mark>`/v2/country/{countryCode}`

Get detailed info about one country (incl. region, income level, capital, geo‑coords).

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description                           |
| ----------- | ------ | ------------------------------------- |
| countryCode | string | Two‑letter ISO code or aggregate code |
