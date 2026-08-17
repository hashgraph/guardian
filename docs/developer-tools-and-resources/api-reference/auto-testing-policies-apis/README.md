# Auto-Testing Policies APIs

Endpoints for adding, running, managing, and retrieving the results of automated policy tests in Guardian.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/policies/{policyId}/test` | Adds a new test to the policy | Yes |
| `GET` | `/api/v1/policies/{policyId}/test/{testId}` | Returns a policy test by ID | Yes |
| `DELETE` | `/api/v1/policies/{policyId}/test/{testId}` | Deletes the specified test | Yes |
| `POST` | `/api/v1/policies/{policyId}/test/{testId}/run` | Starts running the policy test | Yes |
| `POST` | `/api/v1/policies/{policyId}/test/{testId}/stop` | Stops the running test | Yes |
| `GET` | `/api/v1/policies/{policyId}/test/{testId}/details` | Returns details of the most recent test run | Yes |

## Endpoints

- [Adding New Test to the Policy](adding-new-test-to-the-policy.md)
- [Returning Policy Test by ID](returning-policy-test-by-id.md)
- [Deleting the Specified Test](deleting-the-specified-test.md)
- [Running the Policy Test](running-the-policy-test.md)
- [Stopping the Specified Test](stopping-the-specified-test.md)
- [Returning Details of the Most Recent Test Run](returning-details-of-the-most-recent-test-run.md)
