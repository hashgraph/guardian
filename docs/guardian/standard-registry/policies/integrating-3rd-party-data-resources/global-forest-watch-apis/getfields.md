# getFields

GET /dataset/:dataset/:version/fields

Get the fields of a version. For a version with a vector default asset

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| Dataset | string | dataset     |
| Version | number | version     |
