## Table of Contents

- Introduction
- Need and Use for the Hydropower MRV Policy
- Objective and Scope
- Methodology Overview
- Hydropower-Specific Considerations
- Available Roles
- Key Documents & Schemas
- Token (Carbon Emission Reduction)
- Policy Workflow
- IPFS Timestamp
- Step-by-Step
- Testnet Evidence

---

## Introduction

Hydropower is one of the oldest and most reliable forms of renewable electricity generation, 
contributing significantly to global efforts to reduce greenhouse gas (GHG) emissions. 
This Guardian policy digitizes the **CDM ACM0002 methodology** — "Consolidated Baseline 
Methodology for Grid-Connected Electricity Generation from Renewable Sources" — specifically 
tailored for run-of-river and reservoir-based hydroelectric power plants.

ACM0002 was developed within the framework of the Clean Development Mechanism (CDM) under 
the United Nations Framework Convention on Climate Change (UNFCCC). It provides a 
standardized framework for quantifying and verifying GHG emissions reductions from 
grid-connected renewable electricity generation, including hydropower projects.

This policy implementation leverages the **Hedera Guardian** platform to digitize the full 
ACM0002 workflow — from project registration and monitoring data submission through 
third-party verification (VVB) to final issuance of Carbon Emission Reduction (CER) tokens 
on the Hedera Token Service (HTS).

---

## Need and Use for the Hydropower MRV Policy

Hydroelectric power plants displace fossil-fuel-based electricity generation, resulting in 
measurable GHG emissions reductions. However, verifying and certifying these reductions 
requires a rigorous, auditable MRV (Monitoring, Reporting, and Verification) process.

Existing Guardian policies cover general renewables, but hydropower has unique monitoring 
parameters that differ from solar or wind:

- **Continuous generation** — unlike solar/wind, hydro operates 24/7 subject to water 
  availability
- **Water flow dependency** — generation directly tied to volumetric flow rate (m³/s) 
  and hydraulic head height (m)
- **Seasonal variability** — monsoon and dry-season generation profiles require 
  period-specific monitoring
- **Capacity factor tracking** — ratio of actual output to installed capacity over 
  monitoring period
- **Turbidity and water quality** — environmental parameters that affect both turbine 
  efficiency and regulatory compliance

This policy addresses these characteristics by introducing hydro-specific telemetry schemas 
and a device-level DID-anchored monitoring pipeline on Hedera Consensus Service (HCS).

---

## Objective and Scope

The primary objective of this policy is to provide a standardized, blockchain-anchored 
framework for:

1. Registering hydroelectric power projects under ACM0002
2. Collecting and verifying device-level generation telemetry via HCS
3. Calculating GHG emissions reductions against a grid emission factor baseline
4. Issuing CER tokens (1 CER = 1 tonne CO₂e avoided) upon third-party verification

**Scope:** Run-of-river and reservoir hydropower plants connected to the national/regional 
electricity grid. The policy excludes biomass co-firing and pumped-storage projects 
(net energy consumers).

---

## Methodology Overview

ACM0002 establishes a baseline representing the GHG emissions that would have occurred 
without the renewable energy project (i.e., grid average emission factor × displaced MWh). 
The project must demonstrate **additionality** — that the project would not have been 
financially viable without carbon credit support.

**Baseline Emissions Formula:**

`BE_y = EG_y × EF_grid`

Where:
- `BE_y` = Baseline emissions in year y (tCO₂e)
- `EG_y` = Net electricity generated and supplied to grid (MWh)
- `EF_grid` = Combined margin grid emission factor (tCO₂e/MWh)

**Project Emissions** from auxiliary electricity consumption are subtracted to arrive at 
net emission reductions.

---

## Hydropower-Specific Considerations

This policy introduces the following hydropower-specific monitoring parameters not present 
in the generic ACM0002 implementation:

| Parameter | Unit | Description |
|-----------|------|-------------|
| `flow_rate` | m³/s | Volumetric water flow through turbines |
| `head_height` | m | Effective hydraulic head pressure |
| `capacity_factor` | % | Actual output / installed capacity |
| `turbidity` | NTU | Water clarity affecting turbine wear |
| `ph_level` | pH | Water chemistry for environmental compliance |
| `gross_generation` | MWh | Total turbine output before auxiliary consumption |
| `net_generation` | MWh | Grid-supplied electricity (gross minus auxiliary) |

All telemetry is submitted to Hedera Consensus Service and anchored to IPFS via 
the Guardian platform before verification.

---

## Available Roles

**Standard Registry (SR)**
The Standard Registry (in this implementation, mapped to the UNFCCC CDM registry role) 
oversees the full policy lifecycle. The SR approves project registrations, validates 
monitoring reports, and triggers CER token minting upon successful verification. The SR 
is the policy publisher and the final authority in the workflow.

**Project Participant (PP)**
The Project Participant is the hydropower plant operator or project developer. They are 
responsible for registering the project, submitting the Project Description document, 
uploading periodic Monitoring Reports with generation telemetry, and assigning a VVB for 
verification. Upon successful minting, CER tokens are transferred to the PP.

**Verification and Validation Body (VVB)**
The VVB is an independent third-party auditor accredited under CDM rules. They review 
the Project Description for methodology compliance during validation, and review each 
Monitoring Report for accuracy during verification. The VVB approves or rejects 
submissions before they proceed to the SR for final minting approval.

---

## Key Documents & Schemas

**Project Description**
Captures project participant information, plant specifications (installed capacity, 
turbine type, reservoir type), location data (GPS coordinates, grid connection point), 
baseline emission factor, and additionality demonstration. Submitted by the Project 
Participant during registration.

**Monitoring Report**
Filled by the Project Participant at each monitoring period end. Contains gross and net 
generation data (MWh), hydro-specific telemetry (flow rate, head height, capacity factor, 
turbidity, pH), calculated baseline emissions, project emissions, and net emission 
reductions for the period.

**VVB Attestation**
The VVB's formal verification statement attached to each Monitoring Report review. 
Records the VVB's findings, any discrepancies identified, and the final 
approve/reject decision.

**Hydropower Telemetry Schema**
- Schema UUID: `59ad4c29-043a-4d63-ad0a-7d2dfa5d32ca`
- Anchored on Hedera testnet via HCS message #12 during policy publication
- Contains all device-level telemetry fields listed in the Hydropower-Specific 
  Considerations section above

---

## Token (Carbon Emission Reduction)

**Token Type:** Certified Emission Reduction (CER)  
**Standard:** CDM ACM0002  
**Equivalence:** 1 CER = 1 tonne of CO₂e avoided  
**Token ID (Hedera Testnet):** [0.0.7462931](https://hashscan.io/testnet/token/0.0.7462931)  
**Minting Trigger:** SR approval of a VVB-verified Monitoring Report  
**Minting Formula:** `CER_y = (EG_y × EF_grid) - PE_y`

Where `PE_y` is project emissions from auxiliary consumption in year y.

---

## Policy Workflow

The policy implements the following 5-stage workflow:

```
[Standard Registry]
      |
      v
1. REGISTRATION
   Project Participant submits Project Description
   -> SR validates -> Approved/Rejected
      |
      v
2. VVB ASSIGNMENT
   SR or PP assigns accredited VVB to project
      |
      v
3. MONITORING REPORT SUBMISSION
   PP submits Monitoring Report with telemetry data
   -> PP assigns VVB for verification
      |
      v
4. VVB VERIFICATION
   VVB reviews Monitoring Report
   -> Approves or Rejects
      |
      v
5. SR APPROVAL & TOKEN MINTING
   SR reviews VVB-verified report
   -> Approves -> CER tokens minted to Project Participant
   -> Rejects  -> Report returned for revision
```

---

## IPFS Timestamp

`[To be added after policy publication on Hedera mainnet]`

Testnet Policy ID: `69a07fb82a75f6d261a5f595`  
Testnet Operator: `0.0.6255927`  
Guardian Policy Topic (HCS): [0.0.8041423](https://hashscan.io/testnet/topic/0.0.8041423)

---

## Step-by-Step

### 1. Import the Policy

Log in as the **Standard Registry** and import the policy:
- Go to **Policies** tab → click **Import**
- Upload `Hydropower_MRV_ACM0002.policy`
- Or import via IPFS timestamp (see above)

### 2. Publish the Policy

Change policy status from **Draft** → **Publish** (or **Dry Run** for testing).  
Click **Register** to initialize the policy on Hedera.

### 3. Create Project Participant User

- Click **Create User** → assign role: **Project Participant**
- The PP provides their organization name during registration

### 4. Create VVB User

- Click **Create User** → assign role: **VVB**
- The VVB provides their organization/accreditation name

### 5. SR Approves Roles

Log in as SR → go to **Project Participants** tab → click **Approve**  
Then go to **VVBs** tab → click **Approve**

### 6. Project Participant Submits Project Description

Log in as PP → click **New Project** → fill in:
- Plant name, location (GPS), installed capacity (MW)
- Turbine type (Pelton / Francis / Kaplan)
- Grid connection details
- Baseline emission factor (tCO₂e/MWh)
- Additionality justification

Click **Create** → document sent to SR for validation.

### 7. SR Validates Project

Log in as SR → **Projects** tab → **View Document** → click **Validate**  
(or **Reject** if data is insufficient)

### 8. Project Participant Submits Monitoring Report

Log in as PP → **Monitoring Reports** tab → click **Add Report** → fill in:
- Monitoring period (start/end date)
- Gross generation (MWh), net generation (MWh)
- Flow rate (m³/s), head height (m), capacity factor (%)
- Turbidity (NTU), pH level
- Calculated emission reductions (tCO₂e)

### 9. PP Assigns VVB

In **Monitoring Reports** tab → select **Assign** dropdown → choose VVB

### 10. VVB Verifies Monitoring Report

Log in as VVB → **Monitoring Reports** tab → **View Document** → click **Verify**

### 11. SR Approves and Mints CER Tokens

Log in as SR → **Monitoring Reports** tab → **View Document** → click **Approve**  
Status changes: **Minting** → **Minted**  
CER tokens transferred to Project Participant's Hedera account.

### 12. View Token History and TrustChain

- **Token History** tab shows minted CER amounts per monitoring period
- **View TrustChain** button shows the full audit trail from project registration 
  to token issuance, all anchored on Hedera

---

## Testnet Evidence

This policy was developed and tested on Hedera testnet under operator `0.0.6255927`.

| Resource | Description | Link |
|----------|-------------|------|
| Operator Account | Standard Registry account | [0.0.6255927](https://hashscan.io/testnet/account/0.0.6255927) |
| Guardian Policy Topic | HCS topic created by Guardian on policy publish | [0.0.8041423](https://hashscan.io/testnet/topic/0.0.8041423) |
| Telemetry Topic (Direct HCS) | Device telemetry anchoring | [0.0.7462600](https://hashscan.io/testnet/topic/0.0.7462600) |
| Telemetry Topic (Merkle Batch) | Batched Merkle-tree telemetry | [0.0.7462776](https://hashscan.io/testnet/topic/0.0.7462776) |
| CER Token | Carbon Emission Reduction token | [0.0.7462931](https://hashscan.io/testnet/token/0.0.7462931) |
| Full MRV Implementation | Complete Node.js MRV engine | [BikramBiswas786/hedera-hydropower-mrv](https://github.com/BikramBiswas786/hedera-hydropower-mrv) |

> **Note:** Topic `0.0.8041423` is the Guardian-generated policy topic on Hedera testnet. 
> All Guardian workflow messages (schema publications, policy state changes, VC/VP documents) 
> are anchored to this topic. This is the canonical on-chain reference for this policy instance.

**Signed-off-by:** Bikram Biswas \<bikrambiswas786@gmail.com\>
