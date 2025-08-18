# getFeatures

GET /dataset/:dataset/:version/features

Get features

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| Dataset | string | Dataset     |
| Version | number | Version     |
| lat     | number | Latitude    |
| lng     | number | Longitude   |
| z       | number | Zoom level  |
