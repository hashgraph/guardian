# Record APIs

Base URL: `/api/v1/record`
Authentication: All endpoints require Bearer JWT.

The Record API enables recording and replaying policy execution flows. This is used for automated testing, regression verification, and creating reproducible policy workflow demonstrations.

---

## GET /record/:policyId/status

Returns the current recording or running status for a policy.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| status | string | Current status: `NONE`, `RECORDING`, `RUNNING`, `STOPPED` |
| policyId | string | Policy identifier |
| startDate | string | When recording/running started |
| endDate | string | When recording/running ended (if stopped) |
| actions | number | Number of recorded actions |

### Example

**Request:**
```http
GET /api/v1/record/63e3e5e8a01b3c001234abcd/status
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
{
  "status": "STOPPED",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "startDate": "2026-03-30T08:00:00.000Z",
  "endDate": "2026-03-30T08:30:00.000Z",
  "actions": 15
}
```

---

## POST /record/:policyId/recording/start

Starts recording all API interactions with the policy.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy identifier |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| options | object | No | Recording options |

### Response 200 OK

Returns the recording session object.

| Field | Type | Description |
|---|---|---|
| id | string | Recording session ID |
| policyId | string | Policy being recorded |
| status | string | `RECORDING` |
| startDate | string | Start timestamp |

### Error Codes

| Code | Description |
|---|---|
| 400 | Policy is already being recorded |
| 401 | Unauthorized |
| 404 | Policy not found |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/record/63e3e5e8a01b3c001234abcd/recording/start
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{}
```

**Response 200:**
```json
{
  "id": "session-uuid-1234",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "status": "RECORDING",
  "startDate": "2026-03-31T08:00:00.000Z"
}
```

---

## POST /record/:policyId/recording/stop

Stops an active recording session and packages the captured actions.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

### Response 200 OK

Returns the completed recording with all captured actions.

| Field | Type | Description |
|---|---|---|
| id | string | Recording session ID |
| status | string | `STOPPED` |
| actions | array | Array of recorded action objects |
| endDate | string | Stop timestamp |

---

## GET /record/:policyId/recording/actions

Returns all recorded actions from a completed recording session.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

### Response 200 OK

Array of action objects.

| Field | Type | Description |
|---|---|---|
| id | string | Action ID |
| type | string | Action type (e.g., `GET_BLOCK_DATA`, `SET_BLOCK_DATA`, `SELECT_ROLE`) |
| blockId | string | Target block ID |
| blockTag | string | Target block tag |
| document | object | Document data (for SET actions) |
| timestamp | string | When the action was performed |
| user | string | DID of the user who performed the action |

---

## POST /record/:policyId/running/start

Starts replaying a previously recorded session from a ZIP file.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

**Content-Type:** `multipart/form-data`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy to replay against |

### Form Data

| Field | Type | Required | Description |
|---|---|---|---|
| file | binary | Yes | ZIP file containing the recording to replay |

### Response 200 OK

Returns the running session object.

### Example

```http
POST /api/v1/record/63e3e5e8a01b3c001234abcd/running/start
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: multipart/form-data; boundary=---boundary

-----boundary
Content-Disposition: form-data; name="file"; filename="recording.zip"
Content-Type: application/zip

<binary zip content>
-----boundary--
```

---

## POST /record/:policyId/running/stop

Stops the current replay run.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

---

## GET /record/:policyId/running/results

Returns the results of the completed replay run.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| status | string | Final run status: `PASSED`, `FAILED`, `STOPPED` |
| total | number | Total actions replayed |
| passed | number | Actions that matched expectations |
| failed | number | Actions that failed |
| errors | array | Array of failure messages |

---

## GET /record/:policyId/running/details

Returns step-by-step details of the replay run with per-action results.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

---

## POST /record/:policyId/running/fast-forward

Skips ahead in the replay by a given number of steps.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| count | number | Yes | Number of steps to skip |

---

## POST /record/:policyId/running/retry

Retries the last failed step in the replay.

**Authentication:** Required — `POLICIES_POLICY_MANAGE`
