# VM0010 v1.4 — End-to-End Test Procedure (Docker Recovery)

This document defines the procedure to import VM0010.policy into Guardian, execute a synthetic project through the real workflow, and verify calculations. It is written for execution **after** Docker storage is repaired. Do not execute while Docker is unavailable.

## Prerequisites (Verify First)

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Docker daemon healthy | `docker info` | No read-only filesystem errors |
| All 15 containers running | `docker ps` | All `Up` |
| Web-proxy reachable | `curl http://127.0.0.1:3000/health` | `200 OK` |
| API gateway reachable | `curl http://127.0.0.1:3000/api/v1/policies` | `401 Unauthorized` (not 502) |

## Phase 1 — Permission Configuration

Configure one isolated local test account with `POLICIES_POLICY_READ` and `POLICIES_POLICY_CREATE`/`POLICIES_POLICY_MANAGE` using Guardian's supported role-management mechanism (administrator API or migration). Do not bypass authentication, change signing keys, or directly edit database permissions.

## Phase 2 — Policy Import

1. Obtain a JWT token for the test account via `POST /api/v1/auth/login`.
2. Import VM0010.policy via `POST /api/v1/policies`:
   - Header: `Authorization: Bearer <jwt>`
   - Body: the full `VM0010.policy` ZIP binary
3. Verify response: `201 Created` with policy ID and version.
4. Confirm policy appears in `GET /api/v1/policies` listing.
5. Record: policy ID, version, creator DID, timestamp.

## Phase 3 — Synthetic Project Workflow

Create a disposable test project using only synthetic development data:

```
Project: "VM0010 E2E Test Forest"
Sectoral scope: 14
Monitoring year: 2026
Methodology: VM0010 v1.4
```

Execute workflow stages through Guardian's authenticated interface:
1. Submit project description VC
2. Execute calculation blocks in dependency order
3. Verify document generation and schema validation
4. Verify role transitions (Project Proponent → VVB)

## Phase 4 — Calculation Verification

Verify each implemented equation against independent hand-computed fixtures:

| Equation | Fixture | Expected | Verify In Guardian |
|----------|---------|----------|-------------------|
| Eq (40) | C_FUEL=20, BSL=-100, PRJ=-10, LF=0.4, U=0.2 | ER_t*=52.8 | calculate-net-benefits-84 output |
| Eq (41) | PRJ=100, BSL=20, U=0.2 | CR_t*=64 | calculate-net-benefits-84 output |
| Eq (42) | U_PRJ=0.12, U_BSL=0.16 | U_total=0.20 | calculate-uncertainty-85 output |
| Eq (43) | PRJ=100, BSL=20, NPR=0.20 | Bu_CR=16 | calculate-vcus-86 output |
| Eq (44) | PRJ=-10, BSL=-100, NPR=0.20 | Bu_ER=18 | calculate-vcus-86 output |
| Eq (45) | CR=64, Bu_CR=16 | VCU_CR=48 | calculate-vcus-86 output |
| Eq (46) | ER=52.8, Bu_ER=18 | VCU_ER=34.8 | calculate-vcus-86 output |

## Phase 5 — Project Hub Transformation

Test Project Hub transformation using a mock/sandbox destination only:
1. Transform project description to Verra Project Hub CUSTOM format (sectoral scope 14)
2. Verify VCS and CCB program sub-objects emitted
3. Verify `projectType: '14'` set
4. Do not transmit externally without separate approval.

## Phase 6 — Evidence Collection

Record for each step:
- Successful/failed status
- Policy ID and version
- Workflow stages executed
- Calculations actually performed (with Guardian output vs. expected fixture)
- Project Hub transformation results
- Errors and unresolved requirements
- Screenshots suitable for bounty demonstration
- Full regression test results

## Phase 7 — Stop Conditions

Stop and report if any of the following occur:
- Permission change cannot be performed safely through a supported mechanism
- Policy import returns non-2xx status
- Schema validation fails in Guardian runtime
- Calculation results diverge from independent fixtures by > 1e-9
- Docker instability recurs

---

## Current Offline State (Reference)

| Item | Value |
|------|-------|
| VM0010.policy path | `C:\Users\User\Desktop\Engineering-Hub-Challenges\guardian\Methodology Library\DLT Earth Methodology Bounty Program\VM0010 V1.4\VM0010.policy` |
| VM0010.policy size | 54,914 bytes |
| VM0010.policy entries | 39 (38 logic blocks + metadata) |
| Schemas | 22 methodology schemas + 10 system schemas |
| Logic blocks | 20 embedded customLogicBlock expressions |
| Test suite | 236 tests, 235 pass, 0 fail, 1 skip |
| Branch | `develop` |
| Backups | `VM0010-2026-10-29/` and `VM0010-2026-10-29-Eq40-41/` preserved |
