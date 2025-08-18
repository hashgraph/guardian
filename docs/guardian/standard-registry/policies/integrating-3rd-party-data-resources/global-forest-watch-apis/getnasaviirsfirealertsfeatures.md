# getNasaViirsFireAlertsFeatures

GET /dataset/nasa\_viirs\_fire\_alerts/:version/features

Get Nasa Viirs fire alerts features

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description |
| ----------- | ------ | ----------- |
| Version     | string | version     |
| lat         | number | Latitude    |
| lng         | number | Longitude   |
| z           | number | zoom level  |
| start\_date | Date   | Start Date  |
| end\_date   | Date   | End Date    |
