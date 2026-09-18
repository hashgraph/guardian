# Record and Replay APIs

Endpoints for recording, replaying, and managing Guardian policy execution sessions.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/record/{policyId}/recording/start` | Starts recording a policy execution session | Yes |
| `POST` | `/api/v1/record/{policyId}/recording/stop` | Stops the current recording | Yes |
| `GET` | `/api/v1/record/{policyId}/recording/actions` | Returns all recorded actions | Yes |
| `GET` | `/api/v1/record/{policyId}` | Returns the current recording status | Yes |
| `POST` | `/api/v1/record/{policyId}/run/start` | Starts replaying a recording from a ZIP file | Yes |
| `POST` | `/api/v1/record/{policyId}/run/stop` | Stops the replay | Yes |
| `GET` | `/api/v1/record/{policyId}/run/results` | Returns the replay results | Yes |
| `GET` | `/api/v1/record/{policyId}/run/details` | Returns details of the replay run | Yes |
| `POST` | `/api/v1/record/{policyId}/run/fast-forward` | Fast-forwards to a specific step in the replay | Yes |
| `POST` | `/api/v1/record/{policyId}/run/retry` | Retries the current step in the replay | Yes |
| `POST` | `/api/v1/record/{policyId}/run/skip` | Skips the current step in the replay | Yes |

## Endpoints

- [Start Recording](start-recording.md)
- [Stop Recording](stop-recording.md)
- [Get Recorded Actions](get-recorded-actions.md)
- [Get Recording](get-recording.md)
- [Run Record from ZIP File](run-record-from-zip-file.md)
- [Stop Running](stop-running.md)
- [Get Running Results](get-running-results.md)
- [Get Running Details](get-running-details.md)
- [Fast Forward](fast-forward.md)
- [Retry Step](retry-step.md)
- [Skip Step](skip-step.md)
