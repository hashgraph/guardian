# getVersionAsset

GET /dataset/:dataset/:version/assets

Get all assets for a given dataset version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name        | Type   | Description      |
| ----------- | ------ | ---------------- |
| Dataset     | string | Dataset          |
| Version     | number | Version          |
| asset\_type | string | Asset\_Type      |
| asset\_uri  | string | Asset\_URI       |
| is\_latest  | string | Is\_Latest       |
| is\_default | string | Is\_Default      |
| page\[size] | string | size of the page |
