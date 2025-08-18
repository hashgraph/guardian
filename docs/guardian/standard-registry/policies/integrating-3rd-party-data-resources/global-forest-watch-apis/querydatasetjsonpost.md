# queryDatasetJsonPost

POST /dataset/:dataset/:version/query/json

(JSON) Execute a READ-ONLY SQL query on the given dataset version

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
| geometry | Object | Geometry (Stringify object) |
| sql      | query  | SQL                         |
