# 🏛️ Standard Registry in Hedera Guardian

## What is a Standard Registry?

In **Hedera Guardian**, a **Standard Registry** is not a person or company—it's a **designated system role** responsible for **creating, managing, and publishing policy frameworks and data schemas** used in verifiable credentials (VCs) and tokens.

> 📌 Think of it as the **source of truth** for:
> - Policy logic
> - Schema definitions
> - Token and credential structures

---

## Who Typically Acts as a Standard Registry?

- 🌐 Standards-setting NGOs (e.g. Fairfood)  
- 🏢 Trusted cooperatives or ecosystem platforms  
- 🏛️ Industry alliances (e.g. fair-trade bodies, impact funds)  

---

## Why Create a Standard Registry in Guardian?

### ✅ 1. **Source of Trust & Schema Ownership**

The Standard Registry:
- Creates and signs schemas (e.g. `premium-data.schema`, `living-income.schema`)
- Publishes them to **IPFS**
- Ensures all downstream credentials and policies are based on **trusted, version-controlled definitions**

---

### ✅ 2. **Policy Framework Creation**

Policies must:
- Be linked to schemas from a Standard Registry  
- Be **published and approved** by the Registry before use  

🔒 This guarantees consistency and security across all uses of a policy (like "Verified Premium Payments").

---

### ✅ 3. **Decentralized Governance**

A Standard Registry:
- Signs all policy templates, schemas, and VCs using a **Guardian-issued DID**
- Enables **multi-party trust** without central authority
- Ensures third parties (brands, auditors, funders) can independently verify source definitions

---

### ✅ 4. **Public Auditability**

Standard Registries publish:
- Policy JSON files  
- Data schemas  
- Token definitions  

These artifacts are:
- Stored on **IPFS**  
- Signed and timestamped on **Hedera**  
- Verifiable by any external system (wallet, auditor, dashboard)

---

## 📘 Example Use Case

> You define the **Verified Premium Payments Policy**.  
> You create a **Standard Registry DID** for your organization.  
> You publish your schemas and policy under this Registry.  
> Now, any cooperative using your policy can issue VPPTs backed by your **standard**—with full verifiability.

---

## 🧾 Summary Table

| Role                  | Purpose                                                                   |
|------------------------|---------------------------------------------------------------------------|
| **Standard Registry**  | Defines and manages schemas, policies, and governance artifacts           |
| **Why it's needed**    | Ensures trust, consistency, and auditability across Guardian ecosystems   |
| **Who should be one**  | Standards bodies, NGOs, trusted cooperatives, impact-focused platforms    |

---


## ⚙️ Need Help Creating One?
To create a standard registry click sign up, select standard registry option and continue.

![][image1]

Give the account id and private key, then continue.

![][image2]

Proceed with generate new DID document option

![][image3]

Fill in the details and connect to create the account.![][image4]![][image5]



[image1]: <assets/images/standard_registry/account_type.png>
[image2]: <assets/images/standard_registry/hedera_account.png>
[image3]: <assets/images/standard_registry/generate_did.png>
[image4]: <assets/images/standard_registry/details.png>
[image5]: <assets/images/standard_registry/connect_user.png>
