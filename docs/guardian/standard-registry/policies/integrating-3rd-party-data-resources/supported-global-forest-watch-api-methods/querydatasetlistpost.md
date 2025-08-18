# queryDatasetListPost

`POST` `/dataset/:dataset/:version/query/batch`

Execute a READ-ONLY SQL query on the specified raster-based dataset version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name                | Type   | Description                                                         |
| ------------------- | ------ | ------------------------------------------------------------------- |
| Dataset             | string | Dataset                                                             |
| Version             | number | version                                                             |
| feature\_collection | Object | Feature collection (stringify object)                               |
| sql                 | query  | SQL                                                                 |
| uri                 | string | URI to a vector file in a variety of formats supported by Geopandas |
| geostore\_ids       | number | An inline list of ResourceWatch geostore ids                        |
| id\_field           | string | An inline list of ResourceWatch geostore ids                        |
