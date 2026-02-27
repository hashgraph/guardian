# IoT-Integrated Hydropower MRV: Verra ACM0002 v22.0

## Introduction

This repository contains a fully digitized, IoT-integrated implementation of the Verra ACM0002 v22.0 methodology for grid-connected hydropower projects. Unlike the existing static CDM ACM0002 template in the Guardian library, this policy introduces a machine-to-machine (M2M) verification layer that replaces manual data entry with cryptographically signed IoT telemetry.

## Technical Innovation: The "Digital MRV" Evolution

This contribution addresses the "trust gap" in traditional carbon accounting by implementing three core DLT-native features.

### 1. Device-Level DIDs (Machine Identity)

Traditional MRV reports at the project level, which can hide the performance of individual assets. This policy assigns a unique Decentralized Identifier (DID) to every turbine.

- **Impact:** Data is cryptographically signed by the turbine itself, ensuring that the energy generation reported is physically tied to a specific machine.
- **Benefit:** Eliminates "ghost" energy generation and double-counting at the source.

### 2. Real-Time IoT Telemetry (Physical Proof)

While the generic ACM0002 tracks total energy in MWh, this policy tracks the physics of the generation process.

- **Flow Rate (m³/s):** Volumetric water flow through turbines.
- **Head Height (m):** Effective hydraulic head pressure.
- **Turbidity (NTU):** Water clarity affecting turbine efficiency.
- **pH Level:** Environmental compliance monitoring.

**Benefit:** Provides a "proof of physics" that makes it much harder to commit fraud by simply reporting inflated energy numbers.

### 3. REC NFTs with Multi-Tier Royalties

This policy leverages the Hedera Token Service (HTS) to issue Renewable Energy Certificates (RECs) as non-fungible tokens (NFTs).

- **Innovation:** Built-in, multi-tier royalty mechanisms for secondary market transactions.
- **Benefit:** Creates a sustainable revenue model for renewable energy developers, incentivizing long-term project maintenance.

## Methodology & Standard Alignment

- **Standard:** Verra ACM0002 v22.0 (Grid-connected electricity generation from renewable sources).
- **Compliance:** Designed to align with I-REC and Gold Standard renewable energy requirements.
- **Automation:** Digitizes the workflow from project registration to VVB (Validation and Verification Body) approval and token issuance.

## Repository Structure

- `Hydropower_MRV_ACM0002.policy`: Core Guardian policy file (exported from MGS).
- `SCHEMA.json`: JSON schemas for turbine-level telemetry and project descriptions.
- `BOUNTY_REQUEST.md`: Formal request for bounty inclusion with technical justification.
- `EVIDENCE.md`: Hedera testnet evidence, including DID topics and REC token configurations.

## Getting Started

1. Import `Hydropower_MRV_ACM0002.policy` into your Guardian instance.
2. Configure the Standard Registry and VVB roles according to your deployment environment.
3. Connect your IoT sensors to the HCS Telemetry Topic provided in the policy configuration.

## Credits

Developed by **Bikram Biswas** ([@BikramBiswas786](https://github.com/BikramBiswas786)).

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
