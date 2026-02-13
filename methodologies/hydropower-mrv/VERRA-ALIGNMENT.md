# Verra Methodology Alignment
## Compatible Methodologies
**Verra ACM0002 v22.0 - Grid-connected Electricity Generation from Renewable Sources**

- **Applicability:** Small-scale hydropower facilities (< 15 MW) generating renewable electricity
- **Alignment:** Our system digitizes ACM0002 monitoring requirements for hydropower projects
- **Enhancement:** Adds device-level verification via DIDs and real-time cryptographic attestation

## Key Alignments
| Verra Requirement | Our Implementation |
|-------------------|--------------------|
| Energy measurement | Flow meter + head height sensors |
| Data integrity | Cryptographic signatures on HCS |
| Verification | Automated verifier microservice |
| Issuance | HTS tokens (fungible RECs) |
| Retirement | Token burn mechanism |

## I-REC Standard Compliance
✅ Device registry (DID-based)  
✅ Energy output tracking (MWh)  
✅ Monthly aggregation  
✅ Unique identifiers (HTS token IDs)  
✅ Transfer and retirement tracking

## Enhancement Beyond Traditional MRV
1. **Device-Level Identity:** Each turbine has cryptographic DID
2. **Real-Time Verification:** Automated signature verification (vs. periodic audits)
3. **Immutable Audit Trail:** Public DLT (vs. centralized databases)
4. **Tamper Detection:** Instant signature invalidation
5. **Replay Protection:** Nonce-based duplicate prevention

## Future Work
- Formal Verra validation for specific project sites
- Gold Standard methodology integration
- CDM compatibility assessment
