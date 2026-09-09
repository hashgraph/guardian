# Policies

A policy collection of rules, roles, workflows, and data-handling logic that governs how documents (verified credentials), attestations, and reports are issued, verified, and used within an environmental methodology or project.

Policies act like a smart contract template for dMRV orchestrated off-chain by the Guardian where critical checkpoints are anchored to the Hedera network.

#### **Key Components of a Policy**

1. **Policy Roles & Permissions**
   * Define which actors (e.g., Project Developer, Verifier, Standard Body, Registry) can perform specific actions.
   * Example: Only a Verifier role can issue verification credentials.
2. **Schemas**
   * Policies use schemas to structure the data being collected or issued as credentials.
   * Example: A "Project Description VC" schema or "Monitoring Report VC" schema.
3. **Policy Workflows**
   * Step-by-step processes for participants.
   * Example: A Project Developer submits project details → Verifier reviews → Standard Body approves.
4. **Rules & Conditions**
   * Validation checks on data, sequencing of steps, and compliance enforcement.
   * Example: A monitoring report VC must match the schema and include forest carbon flux data before approval.
5. **Credential Lifecycle**
   * Policies define when and how Verifiable Credentials (VCs) and Verifiable Presentations (VPs) are created, validated, mapped, or revoked.
6. **Automation & Anchoring**
   * Automates issuance, verification, and tracking of digital assets (tokens, credits).
   * Anchors hashes of VCs/VPs to the Hedera Consensus Service (HCS) or Hedera Token Service (HTS) for transparency and immutability.
