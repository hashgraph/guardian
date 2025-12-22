# **Verified Premium Payments Policy V1.0**


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
 

### Login Flow

Login using credentials and from the policy tab we can see all policies from the list of policies tab.![][image1]

Then select the policy Verified Premium Payments and choose the role

#### This claim has two roles:

* Co-Operative  
* Farmer

![][image2]

### Policy Workflow

##### Trace Workflow

A workflow is initiated when a claim is attached from a transaction, provided the transaction originates from a farmer. The details of this transaction are submitted as the initial step. The workflow is initiated as a Co-Operative by the receiver (destination) of the transaction. Then the transaction is auto verified by the farmer(source) of the transaction as role ‘farmer’ in guardian. After the verification the token details like hash value, token amount etc are saved in the database for future reference.  
\* The verification is set to work after 5 minutes from the time of submission to avoid internal issues while fetching the transaction in the guardian through  API’s.

![][image3]  
![][image4]  
![][image5]

##### Guardian Workflow

The user with role ‘Co-Operative’ should login and the details of this transaction are submitted as the initial step.

![][image6]

The fields include:

* Number(int) \- Transaction number  
* Date(date) \- Transaction Date  
* Source Short Name(str) \- Transaction Source Name  
* Destination Short Name(str) \- Transaction Destination Name  
* Source(str) \- source blockchain address  
* Destination(str) \- destination blockchain address  
* Quantity(int)  
* Product(str)  
* Price(int)  
* Currency(str)  
* Premium(str)  
* Card(str)  
* Evidence Type(choice)  
* Evidence File Hash(str)  
* Transaction ID(str) \- Required \- The id of the transaction

Evidence Type Choices:

* Bulk Upload Sheet  
* Photo of Receipt  
* Card  
* No evidence

The submitted data can be seen in the Verified Premium Payments tab.

![][image7]

After that the user with role ‘Farmer’ should login and he can see all the transactions submitted by the Co-Operative on the Verified Premium Payments tab. After that the transaction can be verified or rejected. We can filter the data using the transaction ID. For rejecting the transaction he can also submit the reason for rejection.

![][image8]

The Co-Operative can see the status of the transaction from the Verified Premium Payments tab and if approved can see the token details from the token history tab. We can see the details and the complete flow in the token history and trust chain. The token details are filtered by the document ID.

![][image9]

![][image10]

[image1]: <assets/images/list_policies.png>
[image2]: <assets/images/choose_role.png>
[image3]: <assets/images/add_claim.png>
[image4]: <assets/images/added_claim.png>
[image5]: <assets/images/auto_verified.png>
[image6]: <assets/images/co-op_submit_data.png>
[image7]: <assets/images/co-op_view_data.png>
[image8]: <assets/images/farmer_view.png>
[image9]: <assets/images/token_history.png>
[image10]: <assets/images/trust_chain.png>
