# getDataAvailability

`GET` `/api/data_availability/csv/:${FIRMSService.secretTokenParamName}/:sensor`

Retrieve date range availability for a sensor dataset

**Headers**

| Name          | Value              |
| ------------- | ------------------ |
| Content-Type  | `application/json` |
| Authorization | `Bearer <token>`   |

**Body**

| Name   | Type   | Description |
| ------ | ------ | ----------- |
| sensor | string | Sensor      |
