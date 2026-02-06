# Hydropower MRV Methodology v1.0
## Applicability
Small-scale hydropower facilities (< 15 MW) generating renewable electricity with verifiable energy output.
## Baseline Setting
Baseline emissions = Electricity Generated (MWh) × Grid Emission Factor (tCO2e/MWh)  
Grid factor sourced from local electricity authority.
## Additionality
Projects demonstrate additionality through:
1. Investment barriers (lack of commercial viability without carbon credits)
2. Technological barriers (new monitoring infrastructure required)
3. Regulatory barriers (no mandatory renewable energy requirement)
## Monitoring Protocol
### Data Sources
- **Energy Output:** Turbine flow meters (m³/s) × Head height (m) × Efficiency factor
- **DID Verification:** Device-level identity attestation via Hedera HCS
- **Frequency:** Real-time telemetry, aggregated monthly
### Parameters Monitored
| Parameter | Unit | Frequency | Device |
|-----------|------|-----------|---------|
| Flow Rate | m³/s | Continuous | Flow meter |
| Head Height | m | Daily | Pressure sensor |
| Energy Output | MWh | Hourly | Smart meter |
| Capacity Factor | % | Monthly | Calculated |
| pH Level | pH | Hourly | pH sensor |
| Turbidity | NTU | Hourly | Nephelometer |
## Verification Logic
\\\
IF (device_DID_verified AND 
    telemetry_signed AND 
    energy_output > baseline_minimum)
THEN issue_REC(energy_output_MWh)
\\\
## Emission Reductions
**Formula:** ER = Electricity Generated × (Grid EF - Project EF)  
Where Project EF = 0 (renewable source)
## I-REC Compatibility
- Device serial numbers mapped to DIDs
- Energy generation tracked with tamper-proof signatures
- Monthly aggregation for certificate issuance
## References
- I-REC Standard: https://www.irecstandard.org/
- Verra VM0040 (Hydro methodology)
- Gold Standard Renewable Energy Requirements
## Technical Implementation
Full implementation details: https://github.com/BikramBiswas786/hedera-hydropower-mrv
