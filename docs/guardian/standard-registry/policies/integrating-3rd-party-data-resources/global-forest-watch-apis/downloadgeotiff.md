# downloadGeoTiff

GET /dataset/:dataset/:version/download/geotiff

Get geotiff raster tile

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name           | Type   | Description   |
| -------------- | ------ | ------------- |
| Dataset        | string | Dataset       |
| version        | number | Version       |
| grid           | number | Grid          |
| tile\_id       | number | Tile ID       |
| pixel\_meaning | string | Pixel Meaning |
