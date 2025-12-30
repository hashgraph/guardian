# **Verified Premium Payments Policy V1.0**

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen)
![Blockchain](https://img.shields.io/badge/blockchain-Hedera-7952B3)
![Token](https://img.shields.io/badge/token-PPT-orange)

## 🔍 Overview

The **Verified Premium Payments Policy** captures and certifies the extra value a cooperative or buyer transfers to farmers beyond the standard crop price—whether that premium is an annual cash bonus, a quality-linked top-up, or a pooled community-investment fund (e.g., school roofs, water pumps). Using the same lightweight workflow as the core payment policy, the collector records the premium details (type, value, purpose, payout schedule) and chooses a verification route:

* **Farmer NFC Card** – the farmer’s card signs the premium record, proving direct acknowledgement of receipt.  
* **Premium Evidence Upload** – the collector hashes supporting proof (signed acknowledgement form, project invoice, or photo of the completed community asset) and stores only the hash on-chain.

Once the entry passes format checks and the farmer (or evidence) confirms it, Guardian mints a **Premium Paid Token (PPT)**. The token’s metadata not only seals the transaction hash and dual approvals, but also flags the **premium category** (“annual bonus,” “quality incentive,” “community project”) and embeds any evidence hashes.

With a PPT in hand, cooperatives can show brands and impact investors that promised premiums truly reached their destination and—when applicable—funded shared infrastructure. Farmers gain irrefutable proof of the additional value they’ve earned, and buyers gain a clear, on-chain record that their sustainability or living-income commitments translate into tangible, verified cash or community benefits.

 

**Verified Premium Payments Policy – Description**

 

The Verified Premium Payments Policy certifies that any *additional value*—beyond the base crop price—has reached farmers exactly as promised, whether it is:

* **Direct cash** (e.g., an annual living-income bonus)  
* **Quality or data incentives** (top-ups tied to grade or traceability)  
* **Pooled community investments** (school roofs, water points, solar lights)  
* **Goal** – provide a tamper-evident, on-chain proof that premium funds were delivered and acknowledged, creating transparency for brands, impact investors, and farmer groups.  
* **Key inputs** – premium type, amount or in-kind value, purpose, payout schedule, farmer or community IDs, supporting description.  
* **Verification options**  
     
  * **NFC Signature** – the farmer taps an NFC card, cryptographically signing the premium record.  
  * **Evidence Hash** – collector uploads proof (signed receipt, project invoice, asset photo); Guardian stores only the SHA-256 hash.  

* **Outputs**  
     
  * **Premium Record VC** – credential for the submitted premium details.  
  * **Premium Approval VC** – farmer NFC signature *or* hashed evidence confirmation.  
  * **Premium Paid Token (PPT)** – HIP-412 NFT capturing:  
       
    * premium category ("annual\_bonus", "quality\_incentive", "community\_investment"),  
    * payment/evidence hashes,  
    * verification method ("nfc" or "evidence\_hash"),  
    * dual signatures and Hedera timestamp.  
    

* **Roles & DIDs**  
     
  * **Collector / Cooperative** – records premium payout.  
  * **Farmer** – confirms via NFC card or accepts evidence hash.  
    Both operate with Guardian-issued DIDs and receive role-specific credentials.  


* **Compliance & impact** – serves fair-trade/social-premium audit trails, demonstrates delivery of living-income or impact-fund commitments, and underpins outcome-based finance mechanisms.  
* **Artifacts in repo** – premium_paid.policy is open-sourced under Apache-2.0 for audit and reuse.


## 🏁 Prerequisites

In order to use this policy in your Guardian instance, **you must first create a Standard Registry**. The Standard Registry acts as the trusted authority for verifying schema integrity, assigning roles, and approving credentials.

Once the Standard Registry is set up, you can onboard other users (Co-Operative, Farmer etc.) with the correct roles as defined in the policy.

👉 [Learn how to create a Standard Registry](./standard_registry.md)
👉 [Learn how to create a User](./user.md)
👉 [Learn how to import a policy](./import_policy.md)

