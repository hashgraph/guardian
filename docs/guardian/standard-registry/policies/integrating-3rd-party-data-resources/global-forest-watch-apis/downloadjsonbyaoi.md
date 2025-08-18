# downloadJSONByAoi

GET /dataset/:dataset/:version/download\_by\_aoi/json

(JSON) Execute a READ-ONLY SQL query on the given dataset version

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name    | Type   | Description                                                                   |
| ------- | ------ | ----------------------------------------------------------------------------- |
| Dataset | string | Dataset                                                                       |
| Version | number | version                                                                       |
| sql     | query  | SQL                                                                           |
| aoi     | string | GeostoreAreaOfInterest or AdminAreaOfInterest or Global or WdpaAreaOfInterest |
