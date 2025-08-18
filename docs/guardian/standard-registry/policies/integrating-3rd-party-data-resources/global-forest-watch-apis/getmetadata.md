# getMetadata

GET /dataset/:dataset/:version/metadata

Get metadata record for a dataset version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name                       | Type   | Description                |
| -------------------------- | ------ | -------------------------- |
| Dataset                    | string | dataset                    |
| Version                    | number | version                    |
| Include\_dataset\_metadata | string | include\_dataset\_metadata |
