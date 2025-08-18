# downloadJSONPost

POST /dataset/:dataset/:version/download/json

(JSON) Execute a READ-ONLY SQL query on the given dataset version for datasets with (geo-)database tables

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name     | Type   | Description                 |
| -------- | ------ | --------------------------- |
| Dataset  | string | Dataset                     |
| Version  | number | version                     |
| geometry | Object | Geometry (stringify object) |
| sql      | query  | SQL                         |
