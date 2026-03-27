# Technical Whitepaper — AMS-III.AV / VMR0015 Safe Drinking Water dMRV on Hedera

Version: 1.0.0  
Network: Hedera Testnet  
Methodology: AMS-III.AV (UNFCCC) / VMR0015 (Verra)  
Developer: Bikram Biswas (@BikramBiswas786)  
Date: March 27, 2026


## 1. System Architecture

### 1.1 High-Level Design

The system implements AMS-III.AV / VMR0015 as a fully digital MRV pipeline on Hedera, using the same 5‑layer architecture proven in the hydropower MRV system and extended for safe drinking water.[cite:17][cite:21][cite:22]

Layers:

1. **Device & Identity Layer**  
   - Each water treatment unit is assigned a Hedera DID, e.g. `did:hedera:testnet:water-project-001-unit-01`.  
   - The device controller holds the private key and signs telemetry payloads using Ed25519.[cite:22]

2. **Ingestion & Integrity Layer**  
   - Signed telemetry is submitted to Guardian / MGS and anchored to Hedera Consensus Service (HCS).  
   - Telemetry and workflow events use a shared audit topic on testnet: `0.0.8389553`.[cite:22]

3. **Methodology Logic Layer (Guardian Policy)**  
   - A Guardian policy (`AMS-III.AV_VMR0015.policy`) encodes AMS-III.AV / VMR0015 forms, workflows, and calculations.  
   - 6 schemas and 12 blocks implement the full lifecycle from project registration to VCU issuance.[cite:14][cite:22]

4. **Tokenization Layer (HTS)**  
   - Verified emission reductions are tokenized as HTS VCUs using token `0.0.8386569` on Hedera testnet.[cite:22]  
   - 1 on-chain VCU = 1 tCO₂e avoided.

5. **Registry & Integration Layer**  
   - Data structures align with Verra VMR0015 and DLT Earth’s methodology bounty requirements, enabling export to registry or pilot programmes.[cite:20][cite:21]


### 1.2 Hedera Resources

MGS / Operator Identity (Hedera testnet):[cite:22]

- MGS Tenant ID: `69c560549e226cf982f4c537`  
- Hedera Account: `0.0.8386569`  
  - https://hashscan.io/testnet/account/0.0.8386569  
- User Topic: `0.0.8386573`  
  - https://hashscan.io/testnet/topic/0.0.8386573/messages  
- MGS DID:  
  `did:hedera:testnet:528MpTpBEbtCYhW9KUde12XU47xQd39T5qQey87LP3Wm_0.0.8386573`

Core AMS‑III.AV testnet resources (see `EVIDENCE.md` for full details):[cite:22]

- Policy / Audit Topic: `0.0.8389553`  
- Telemetry Topic: `0.0.8389553` (same topic, different message types)  
- VCU Token: `0.0.8386569`


### 1.3 Guardian Policy Structure

The Guardian policy contains:[cite:14][cite:22]

- **Schemas (6)**  
  - Project Registration  
  - Public Network Check  
  - Water Quality Survey  
  - Annual Monitoring Report  
  - Emission Reduction Calculation  
  - VVB Verification Report

- **Roles (3)**  
  - Standard Registry  
  - Project Participant  
  - VVB

- **Blocks (12+)**  
  - Import / publish policy  
  - Project registration and VC issuance  
  - Public network eligibility check  
  - Baseline water quality survey  
  - Monitoring data submission  
  - Emission reduction calculation  
  - VVB verification and scoring  
  - VCU token minting  
  - Audit / export utilities


## 2. Data Model

### 2.1 Key Entities

Core entities modeled in `SCHEMA.json`:[cite:14][cite:22]

- **Project**  
  - ID, location (lat/long, country, state, district)  
  - Technology type (e.g. solar water heating + PV)  
  - Baseline fuel (e.g. firewood) and usage fraction  
  - Population / households served  
  - Commercial operation date  
  - Participant DID

- **Public Network Check**  
  - Presence / absence of safe public water network  
  - Evidence references and verifier DID

- **Water Quality Survey**  
  - Microbiological and physicochemical parameters (E. coli, turbidity, pH, chlorine residual)  
  - Lab certification metadata

- **Monitoring Report**  
  - Monitoring period (start/end)  
  - Water volume, energy use, appliances functional  
  - Device DID, signature, nonce, Merkle root

- **Emission Calculation**  
  - Baseline, project, leakage, emission reductions  
  - All input parameters used in formulas

- **VVB Verification Report**  
  - Scores per dimension, overall verdict, comments  
  - VVB DID and signature


### 2.2 Example Project (Testnet)

The reference deployment uses “Bangalore Safe Water Initiative” as sample data; the full JSON payload and transaction IDs are documented in `EVIDENCE.md`.[cite:22]


## 3. Methodology Formulas (AMS-III.AV / VMR0015)

The policy encodes the official AMS‑III.AV / VMR0015 equations and applies them automatically.[cite:16][cite:22]

Let:

- \( QPW_y \) = quantity of potable water supplied in year y (m³)  
- \( m \) = fraction of population that previously boiled water  
- \( X_{boil} \) = specific energy required to boil 1 m³ of water (MJ/m³)  
- \( SEC \) = specific electricity consumption per m³ (kWh/m³)  
- \( EF_{fuel} \) = emission factor of baseline fuel (tCO₂e/MJ)  
- \( EF_{grid} \) = emission factor of grid electricity (tCO₂e/kWh)  
- \( energy_{kwh} \) = electricity used in the project (kWh)  
- \( LE_y \) = leakage emissions in year y (tCO₂e) (zero for this project type)

### 3.1 Baseline Emissions

\[
BE_y = QPW_y × m × X_{boil} × SEC × EF_{fuel} × 10^{-9}
\]

Example (January 2026 testnet run):[cite:22]

- \( QPW_y = 150,000 \) m³  
- \( m = 0.75 \)  
- \( X_{boil} = 2.5 \) MJ/m³  
- \( SEC = 0.12 \) kWh/m³  
- \( EF_{fuel} = 0.085 \) tCO₂e/MJ  

Result: \( BE_y = 15.3 \) tCO₂e.

### 3.2 Project Emissions

\[
PE_y = energy_{kwh} × EF_{grid}
\]

Example:[cite:22]

- \( energy_{kwh} = 18,000 \) kWh  
- \( EF_{grid} = 0.095 \) tCO₂e/kWh  

Result: \( PE_y = 1.71 \) tCO₂e.

### 3.3 Leakage

For this class of water treatment projects, leakage is modeled as:

\[
LE_y = 0
\]

in line with AMS‑III.AV guidance for non‑fuel‑switching leakage in this configuration.[cite:16]

### 3.4 Emission Reductions

\[
ER_y = BE_y - PE_y - LE_y
\]

Using the example values:[cite:22]

- \( ER_y = 15.3 - 1.71 - 0 = 13.59 \) tCO₂e  
- Rounded: 13.6 tCO₂e → 13.6 VCUs minted.


## 4. Security Model

### 4.1 Identity and DIDs

- Device DIDs follow `did:hedera:testnet:<device-fragment>`.  
- Each DID is backed by a key pair controlled by the device or gateway.  
- MGS account `0.0.8386569` and DID `did:hedera:testnet:528MpT..._0.0.8386573` anchor user/tenant identity on testnet.[cite:22]

DID and VC documents are anchored on the MGS user topic `0.0.8386573`.[cite:22]


### 4.2 Signing and Integrity

For each monitoring report:[cite:22]

1. Device generates payload (water volume, energy, quality metrics, timestamps).  
2. Payload is hashed and signed with device private key (Ed25519).  
3. Guardian validates signature against device DID document.  
4. Nonce is checked to prevent replay.  
5. Optional Merkle root represents a batch of individual readings; root is stored in the MRV record and, if needed, individual readings can be proved against it.

If any of signature, nonce, or Merkle proof fails, the policy rejects the monitoring step and logs an error event on HCS.


### 4.3 HCS Audit Trail

All critical events (policy publication, project registration, checks, monitoring, calculations, verification, minting) are logged to the HCS policy topic `0.0.8389553`.[cite:22]

- Each event includes a type code (e.g. `POLICY_PUBLISHED`, `MONITORING_DATA_SUBMITTED`, `VCU_MINTED`), a timestamp, and a hash of the underlying VC/JSON document.  
- HashScan provides public verification of ordering and immutability of these messages.


### 4.4 Token Security (HTS)

The VCU token `0.0.8386569` is configured with:[cite:22]

- Treasury: `0.0.8386569` (MGS operator account).  
- Decimals: 8, so 13.6 VCU is represented as 13,600,000,000 units.  
- Minting is performed only by the Guardian policy when:  
  - A VVB verification report exists and is APPROVED.  
  - Emission reduction calculation has been successfully executed.  
  - All MRV conditions (water quality, eligibility, monitoring integrity) are satisfied.

The minting transaction, recipient, and total supply are verifiable on HashScan.


## 5. Workflow Walkthrough

### 5.1 Policy Publication

- Import `AMS-III.AV_VMR0015.policy` into MGS.  
- Publish the policy; Guardian writes policy metadata to topic `0.0.8389553` and returns a Policy ID (recorded in `EVIDENCE.md`).[cite:22]


### 5.2 Project Lifecycle (Bangalore Safe Water Initiative)

1. **Registration**  
   - Project Participant submits registration form; a VC is created and anchored to HCS.  
   - Transaction and VC hashes are listed in `EVIDENCE.md`.[cite:22]

2. **Public Network Check**  
   - VVB (or designated verifier) records that no safe public water network exists in the project area.  
   - Result (`projectEligible = true`) is stored as VC + HCS event.[cite:22]

3. **Baseline Water Quality**  
   - Lab data for E. coli, turbidity, pH, chlorine residual is captured.  
   - WHO thresholds are enforced; non‑compliance blocks progression.[cite:16][cite:22]

4. **Monitoring**  
   - For each period, device DID sends signed payloads.  
   - Guardian verifies signature, nonce, Merkle root (if used), then logs to telemetry/policy topic.[cite:22]

5. **Emission Calculation and Verification**  
   - Guardian runs AMS‑III.AV formulas using recorded parameters.  
   - VVB role reviews data and approves or rejects; approval creates the final verification report VC + HCS record.[cite:22]

6. **VCU Issuance**  
   - On approval, Guardian mints VCUs via HTS token `0.0.8386569`.  
   - Mint transaction and new supply are visible on HashScan; details are summarized in `EVIDENCE.md`.[cite:22]


## 6. Relation to Hydropower dMRV Architecture

This design reuses the same architectural pattern as the hydropower ACM0002 implementation already merged into `hashgraph/guardian` (PR #5687, #5715):[cite:17][cite:18][cite:21]

- DID device identity and signing  
- HCS for immutable audit logs  
- Multi-layer verification (physics + anomaly detection + policy constraints)  
- HTS tokenization of verified emission reductions  

The only layer changed for AMS‑III.AV is the physics and emissions calculation logic; all other layers remain compatible and reusable.


## 7. Compliance and Extensibility

- The policy is aligned with AMS‑III.AV / VMR0015 methodology requirements for baseline, project, and emission reduction calculations, as well as eligibility, additionality, and water quality conditions.[cite:16]  
- The same pattern can be extended to biogas (ACM0010) and other methodologies by swapping the physics/calculation layer and adapting the schemas, while retaining identity, audit, and tokenization layers.

For a non‑technical execution path from `.policy` file to bounty payment (including account setup, deployment, evidence capture, PR, and claim), see `AMS-III.AV-beginner-guide.md`.[cite:21]
