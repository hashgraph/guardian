# 💰 Digital Receipt Policy

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Blockchain](https://img.shields.io/badge/blockchain-Hedera-7952B3)
![Token](https://img.shields.io/badge/token-DRT%20%7C%20PPT-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

## 📘 Overview

The **Digital Receipt Policy** transforms each farm-gate transaction into a tamper-evident digital receipt that both farmers and cooperatives can showcase. A collector submits the payment record—amount, currency, reference, and payout date—and chooses one of two validation routes:

* **Farmer NFC Card:** The farmer taps their NFC card in the Trace app; the card’s private key signs the transaction, providing an indisputable farmer-side signature.  
* **Receipt Evidence:** the collector uploads a photo (cash slip, mobile-money screenshot, signed voucher). Guardian stores only the SHA-256 hash of the image, proving the evidence exists without revealing its contents.

Guardian checks basic formatting, then routes the record to the farmer (NFC) or to automated image-hash validation (photo). When the chosen verification passes, Guardian mints a **Digital Receipt Token (DRT)**.

* If the record was signed with an NFC card, the token’s metadata flags **signature\_type: “nfc”** and embeds the farmer-card DID.  
* If it relied on hashed imagery, the token notes **signature\_type: “receipt\_hash”** and stores the file hash and mime-type.

Either way, the DRT anchors the transaction hash, verification method, dual approvals, and timestamp on Hedera. Cooperatives can hand these tokens to brands or lenders as proof of fair, on-time payments, while farmers retain an immutable income record for premium claims or credit scoring—replacing paper slips with a single, cryptographically verifiable source of truth.

## **Policy Description**

The Digital Receipt Policy digitises farm-gate transactions so cooperatives can prove—instantly and immutably—that farmers received full and timely payment.

* **Goal** – replace paper receipts and ad-hoc spreadsheets with a tamper-evident record of each payment, consumable by brands, lenders, and auditors.  
* **Verification modes** –  
  * **NFC signature** – farmer taps an NFC Farmer Card; the card’s key signs the payment.  
  * **Receipt hash** – collector uploads a photo or PDF of the cash slip / mobile-money screenshot; Guardian stores only the SHA-256 hash as evidence.  
* **Key inputs** – amount, currency, transaction reference, payment date, farmer ID, optional receipt image.  
* **Outputs**  
  * Verifiable Credential for the submitted payment (“Payment Record VC”).  
  * Verifiable Credential for the farmer or evidence confirmation (“Payment Approval VC”).  
  * **Digital Receipt Token (DRT)** – a HIP-412 NFT whose metadata flags the verification method ("nfc" or "receipt\_hash"), embeds dataset hashes, dual approvals, and a Hedera timestamp.  
* **Roles & DIDs** –  
  * **Collector / Cooperative** – submits payment record.  
  * **Farmer** – provides NFC signature *or* accepts the receipt hash.  
    Each actor operates under a Guardian-issued DID and receives role-specific credentials.  
* **Compliance hooks** – supports proof-of-payment requirements in fair-trade schemes and buyer ESG audits; doubles as verifiable income evidence for farmer credit scoring.  
* **Schemas & files** – digital_receipt.policy is provided under Apache-2.0 for audit or extension.

# **Detailed Workflow**

![][image1]. 


This workflow converts each payout to a farmer into an on-chain **Digital Receipt Token (DRT)**.

Two roles participate:

* **Collector / Cooperative** – initiates the record and supplies evidence.  
* **Farmer** – authenticates the record with either an NFC-card signature *or* acceptance of a hashed receipt image.

### **1 . Payment Submission (Collector / Cooperative)**

* Opens the *Digital Receipt* form and enters: amount, currency, transaction reference, payment date, farmer ID.  
* Chooses a verification route:  
  1. **NFC signature** – will hand device to the farmer.  
  2. **Receipt evidence** – uploads a photo/PDF of the cash slip, mobile-money screenshot, or signed voucher.  
* Guardian stores the raw fields plus (if a file is uploaded) the **SHA-256 hash** of the image; the image itself is discarded or kept off-chain in the collector’s system.  
* Record becomes a **Payment Record Verifiable Credential (VC)** with status **“Submitted”**.

### **2 . Automated Validation**

* Checks numeric ranges (amount \> 0, proper ISO currency).  
* If any test fails, status → **“Error – Needs Correction,”** and the collector is prompted to edit; otherwise, the credential moves to **“Awaiting Farmer Confirmation.”**

### **3 . Farmer Confirmation (Farmer)**

| Verification path | What happens | Outcome |
| :---- | :---- | :---- |
| **NFC Card** | Farmer taps card in Trace app → card’s private key signs the payment hash | Guardian appends the signature to the Payment Record VC |
| **Receipt Hash** | Collector shows the on-screen payment summary; farmer presses **Accept** on their phone (SMS / app prompt) | Guardian records a farmer acceptance hash |

If the farmer disputes the data, status → **“Rejected by Farmer”** and the record returns to the collector for correction or cancellation.

### **4 . Final Approval**

The presence of both signatures (collector \+ farmer) triggers an automated **Final Approval VC**. Guardian executes an integrity check to ensure:

* the stored payment hash matches the hash signed by the farmer;  
* the evidence hash (if any) matches the file hash recorded at submission.

### **5 . Token Minting**

* On successful approval Guardian mints a **HIP-412 NFT** – the *Digital Receipt Token (DRT)* – with metadata fields

## **Detailed Workflow**

The policy converts any premium—cash bonus, quality incentive, or community-fund investment—into a cryptographically verifiable record. Two actors participate:

* **Collector / Cooperative** – records the premium payout.  
* **Farmer (or Community Representative)** – confirms receipt by NFC card **or** accepts hashed evidence.

#### **1  Premium Submission (Collector / Cooperative)**

1. Open the **Premium Payments** form.  
2. Enter core details:  
   * premium category (annual bonus │ quality incentive │ community investment)  
   * amount or in-kind value and currency  
   * purpose / project description  
   * payout date and schedule (one-off or instalment)  
   * farmer ID(s) *or* community group ID  
3. Choose a verification route:  
   * **NFC signature** – for direct cash or quality top-ups.  
   * **Evidence upload** – for community projects; attach a receipt image, signed roster, or asset photo.  
4. Guardian stores the structured fields and—if a file is supplied—the **SHA-256 hash** of the file (file itself remains off-chain).  
5. Credential status ⇒ **Submitted**.

#### **2  Automated Validation**

* Checks numeric ranges, ISO currency, and a valid premium category tag.  
* Verifies beneficiary IDs exist.  
* Failure ⇒ status **Error – Needs Correction** (Collector must edit).  
* Pass ⇒ status **Awaiting Beneficiary Confirmation**.

#### **3  Beneficiary Confirmation (Farmer )**

| Route | Action | Credential Produced |
| :---- | :---- | :---- |
| **NFC Card** | Tap card in Trace; the card’s key signs the premium hash. | **Premium Approval VC** with NFC signature |
| **Evidence Hash** | Collector presents premium summary; beneficiary taps **Accept** in SMS/App prompt. | **Premium Approval VC** referencing the evidence hash |

Rejection loops the record back to the Collector (status **Rejected by Beneficiary**).

#### **4  Final Integrity Check**

1. Payment hash signed by Collector matches the one signed/accepted by the beneficiary.  
2. If verification\_method \= evidence\_hash, the stored SHA-256 matches the file hash.

Mismatch ⇒ **Hash Mismatch – Investigate** (policy admin review).

Success ⇒ status **Ready for Tokenisation**.

#### **5  Token Minting**

Mints a **Premium Paid Token (PPT)** (HIP-412 NFT).


## 🏁 Prerequisites

In order to use this policy in your Guardian instance, **you must first create a Standard Registry**. The Standard Registry acts as the trusted authority for verifying schema integrity, assigning roles, and approving credentials.

Once the Standard Registry is set up, you can onboard other users (Co-Operative, Farmer etc.) with the correct roles as defined in the policy.

👉 [Learn how to create a Standard Registry](./standard_registry.md)
👉 [Learn how to create a User](./user.md)
👉 [Learn how to import a policy](./import_policy.md)

[image1]: <assets/images/workflow.png>
