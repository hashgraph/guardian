# getGeostoreByVersion

GET /dataset/:dataset/:version/geostore/:geostore\_id

Retrieve GeoJSON representation for a given geostore ID of a dataset version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name         | Type   | Description |
| ------------ | ------ | ----------- |
| Dataset      | string | Dataset     |
| Version      | number | version     |
| geostore\_Id | string | Geostore ID |
