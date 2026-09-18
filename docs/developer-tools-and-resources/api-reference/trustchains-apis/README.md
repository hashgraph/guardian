# Trustchain APIs

**Base URL:** `/api/v1/trust-chains`

These endpoints allow auditors to list VP (Verifiable Presentation) documents and build full trustchains tracing a VP back to its root Verifiable Credential, enabling verification of carbon credit provenance.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`. Permission `AUDIT_TRUST_CHAIN_READ` is required for all endpoints.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/trust-chains` | Return a list of all VP documents | Yes |
| GET | `/trust-chains/{hash}` | Build and return a trustchain from a VP to the root VC | Yes |

---

## Endpoint Details

* [Requesting VP Documents](requesting.md) — `GET /trust-chains`
* [Building and Returning a Trustchain](building-and-returning.md) — `GET /trust-chains/{hash}`
