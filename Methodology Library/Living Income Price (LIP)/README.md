# 🌾 Living Income Policy

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Blockchain](https://img.shields.io/badge/blockchain-Hedera-7952B3)
![Token](https://img.shields.io/badge/token-LIT-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

## 📘 Introduction

The **Living Income Price (LIP)** methodology—developed by Fairfood and Heifer International—answers a single, practical question: *“What price does a farmer need for this crop, this season, in this place, to earn a dignified living?”* Field teams capture yields, farm sizes and costs; cooperatives add their margins; exporters contribute freight figures; and the latest consumer-price index and living-income benchmark localise everything to “today’s money.” From that evidence, the formula produces three price floors (farm-gate, cooperative, FOB) and a cost-yield-efficiency score that shows whether the gap should be closed by better yields, lower costs, or simply higher pay.

Our work is to **digitise that methodology using Guardian**—turning each paper-based step into an on-chain workflow that issues a cryptographically-sealed **Living Income Token (LIT)** only after every submission is verified and every calculation is approved. Because the underlying household data can be sensitive, we roll the policy out in two deliberate phases:


**Phase 1 – High-Level Transparency.**  
Guardian records who submits, who verifies, and when the LI Token is minted, but stores only aggregated or minimal fields on-chain. Stakeholders can already audit the workflow and signatures without seeing private figures.  

**Phase 2 – Selective Granularity.**  
Once partners agree on privacy rules, the schemas expand to accept full household-level data. Role-based access reveals details only to authorised parties, while public observers still see the immutable proofs.  

In essence, **LIP supplies the data-driven price formula**; **Guardian supplies the trust layer** — turning complex living-income calculations into a staged, verifiable process that first proves integrity, then unlocks deeper insight, ensuring farmers are paid a price that truly meets the living-income threshold.

---

## **Policy Description**

 

### **1 Policy / Methodology Description**

 

The LIP Policy digitises the Living Income Price framework (Commodity Living Income Strategy White Paper, Sept 2024\) inside Guardian.

Its purpose is to calculate and immutably prove the minimum price a smallholder must receive to reach a living income.

 

* **Goal** – derive a verifiable price floor (farm-gate, cooperative, FOB) and seal it with cryptographic attestations.  
* **Key inputs** – farmer surveys (yield, farm size, costs), cooperative ledgers, living-income benchmark (LIB), and local CPI.  
* **Outputs**  
     
  * Verifiable Credentials (VCs) at every data-collection and calculation step.  
  * **Living Income Token (LIT)** – a HIP-412 NFT whose metadata holds dataset hashes, price floors, Cost-Yield-Efficiency class, and multi-sig approvals.  
*    
* **Roles** – Data Collector, Facilitator, Analyst, Standards Regulator, Methodology Owner (each with a Guardian DID and role-specific VC).  
* **Compliance hooks** – aligns with UNGP Principle 22 on living wage/income, EU CSRD E1-7, and GHG Protocol for beyond-value-chain (BVC) price-premium tracking.  
* **Schemas & files** – living_income.policy is included; It is Apache-2.0 licensed for audit and extension.

# **Workflow Description** 

![][image1]  

The Living Income Price (LIP) workflow is structured to systematically gather, validate, analyse, and securely publish data that informs the minimum viable price ensuring farmers achieve a living income. T

### **1\. Scoping and Preparation(Methodology Owner)**

This initial phase ensures a solid foundation:

* **Kick-off meeting:** Align stakeholders, confirm expectations, define objectives clearly.  
* **Indicator Framework Adjustments:** Refine data collection metrics to suit local contexts.  
* **Intake Form & Contextualisation:** Prepare detailed surveys aligned with the specific agricultural region and commodities.  
* **Survey feedback & sampling design:** Conduct a feedback session on survey tools and finalise sampling methodology ensuring robust statistical validity.

### **2\. Feedback on Survey and Sample (Partner Company/Implementer)**

* Partners review survey drafts and the sampling approach to ensure cultural relevance, clarity, and practical feasibility.  
* Inputs gathered here inform refinements before field implementation.

### **3\. Data Collection Planning and Enumerator Training (Facilitator)**

* Comprehensive training of enumerators is undertaken to ensure accurate, unbiased, and consistent data collection.  
* Enumerators become adept at handling survey tools, understanding data ethics, and identifying data quality concerns in real-time.

### **4\. Pilot Survey (Data Collector)**

* Enumerators initially collect a small-scale pilot survey to test the validity and reliability of survey tools and processes.  
* Pilot results identify issues early, allowing adjustments before scaling up.

### **5\. Verification of Pilot Data (Facilitator)**

* Pilot data is thoroughly reviewed by the Facilitator for completeness and accuracy.  
* Corrections required at this stage prompt re-collection or adjustments by enumerators, ensuring data reliability before full deployment.

### **6\. Survey Iterations (Full Data Collection) (Data Collector)**

* After successful pilot verification, enumerators proceed with large-scale data collection, iterating as necessary to achieve high-quality and complete datasets.  
* Data is uploaded regularly, with automated validations flagging potential anomalies immediately.

### **7\. Primary Verification and Approval(Facilitator)**

* The Facilitator evaluates the complete dataset using defined quality-assurance checks.  
* Any discrepancies trigger re-verification cycles with enumerators.  
* Approved datasets move forward, receiving a Verified Data Credential within Guardian, indicating initial validation and ensuring immutable auditability on-chain.

### **8\. Data Cleaning (Facilitator → Analyst)**

* Verified data undergoes systematic cleaning to identify and correct outliers, duplicates, and other anomalies.  
* Cleaned data is submitted for detailed analysis.

### **9\. LIP Calculation and Analysis (Analyst)**

* Using the clean dataset, the Analyst calculates the Living Income Price (LIP) for farm-gate, cooperative, and FOB levels.  
* Analyst further assigns a Cost-Yield-Efficiency (CYE) score, identifying where improvements can best address income gaps (yield improvements, cost reductions, or price increases).  
* Results are documented comprehensively for review.

### **10\. Analyst Re-Verification(Analyst)**

* Analysts rigorously cross-check all calculations to validate accuracy and compliance with the established methodology, ensuring analytical robustness before further review.

### **11\. Facilitator Secondary Verification (Facilitator)**

* Facilitator performs a second layer of scrutiny on the Analyst’s computations and supporting data.  
* Any identified issues prompt iterative improvements from the Analyst, maintaining data integrity and methodological compliance.

### **12\. Independent Review (Standard Regulator)**

* Independent validation by a Standards Regulator confirms compliance with methodological benchmarks, computational accuracy, and reliability of input data.  
* Any failures here revert back to Analyst re-verification, ensuring only fully vetted analyses progress further.

### **13\. Token Generation and Final Verification (Guardian)**

* Upon successful independent verification, Guardian securely mints a cryptographic **Living Income  Token (LIT)**.  
* The LIPT’s metadata records dataset hashes, price calculations (farm-gate, cooperative, FOB), CYE classification, and signatures from both Facilitator and Standard Regulator.  
* This digital token provides immutable, cryptographic proof of the transparent, rigorous, and methodologically robust process.

 

 

### **Outcome – Trust and Transparency**

 

The final verified and tokenised Living Income Price data is published transparently via Guardian and Trace platforms. It provides:

 

* Farmers and cooperatives credible evidence for fair pricing negotiations.  
* Brands and traders reliable proof for ESG compliance.  
* Investors and NGOs validated metrics for targeted poverty alleviation financing.

 

 

Thus, this structured, iterative, and meticulously verified workflow ensures every stakeholder can trust that the living income calculations are accurate, transparent, and genuinely impactful.

| \# | Steps | Primary Actor(s) | Guardian Blocks | Artifacts | QC / Status |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 0 | Scoping & Prep | Methodology Owner ↓ Data Collector | Form Builder | Project Charter VC | n/a |
| 1 | Pilot Survey | Data Collector → Facilitator | Form Filler → Approval Block | Pilot Dataset VC | Facilitator “Verified / Needs Fix” |
| 2 | Full Collection | Data Collector | Bulk Upload Block | Dataset VC | Facilitator approval |
| 3 | Cleaning & Analysis | Analyst | Dry-Run Calculator Block | Clean Dataset VC | Analyst self-check |
| 4 | Price Computation | Analyst | Formula Engine Block | LIP Calculations VC | — |
| 5 | Peer Review | Facilitator → Standards Regulator | Sequential Approval Blocks | Signed Calculation VC | Regulator approval |
| 6 | Tokenisation | Guardian Core | Mint NFT Block | **LIT** | Auto “Complete” |

## **Roles**

| Role | Permissions | Restrictions |
| :---- | :---- | :---- |
| Data Collector | Submit new household data Edit submissions before verification | Cannot verify or modify policy rules |
| Verifier (Auditor) | Review and approve or reject data | Cannot alter final calculations Cannot modify policy settings |
| Analyst / Living Income Expert | Access verified data Run or oversee calculations Generate final results | Typically not allowed to alter raw input data |
| Policy Administrator | Update the Guardian policy Define new schemas Create or remove roles | Usually does not input or verify data Oversees system integrity |
---

## 🏁 Prerequisites

In order to use this policy in your Guardian instance, **you must first create a Standard Registry**. The Standard Registry acts as the trusted authority for verifying schema integrity, assigning roles, and approving credentials.

Once the Standard Registry is set up, you can onboard other users (Data Collectors, Facilitators, Analysts, etc.) with the correct roles as defined in the policy.

👉 [Learn how to create a Standard Registry](./standard_registry.md)
👉 [Learn how to create a User](./user.md)
👉 [Learn how to import a policy](./import_policy.md)

[image1]: <assets/images/workflow.png>
