# getVersion

GET /dataset/:dataset/:version

Get basic metadata for a given version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| Dataset | string | Dataset     |
| Version | number | version     |
