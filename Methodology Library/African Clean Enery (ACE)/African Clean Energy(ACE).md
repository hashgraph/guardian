# African Clean Energy(ACE) Policy

This policy sets out the standard procedure for collecting stove usage data, transforming it into measurable carbon offsets, and managing CO₂ tokens through Salesforce and Google Cloud systems. It ensures transparent, verifiable, and certifiable carbon credit generation aligned with Gold Standard or equivalent certification.

* Stove usage data collection and syncing  
* Data processing in BigQuery and Salesforce  
* Token creation, validation, and verification  
* Export of data for external certification bodies  
* Minting and retiring of CO₂ tonnes

# Workflow in Guardian

This workflow governs how customer, device, and stove data are logged, validated, and transformed into verifiable carbon credits using the **Hedera Guardian** platform. It ensures a transparent, auditable process from raw data collection to the issuance and retirement of CO₂ tokens.

## Roles

* ***Project Developer*** : Adds customers, registers devices, and submits onboarding data.  
* ***Consultant***: Reviews submitted data, checks quality, and validates completeness.  
* ***Auditor***: Independently reviews data and verifies compliance with carbon standards (e.g., Gold Standard).

### Login Flow

Login using credentials and from the policy tab we can see all policies from the list of policies tab.![][image1]

Then select the policy African Clean Energy(ACE) and choose the role

#### This claim has three roles:

* Project Developer  
* Consultant  
* Auditor

![][image2]

## Workflow Steps

### Step 1: Data Entry

The project developer will add the customer, device and shop onboarding from their respective tabs.

* Add Customer: Adds the customer details to the guardian system.  
  ![][image3]  
    
* Device Registration: Add the stove.Each stove is registered with a unique customer and shop![][image4]  
* Shop Onboarding: Adds the details of the shop from where the stoves are sold.![][image5]

### 

### Step 2: Data Submission

The project developer will submit all the related data like usage data, customer details, fuel sales etc along with the stove and customer unique number. 

![][image6]

### Step 3: Consultant Review

After the submission of data by the project developer the consultant validated the data. If the data is approved the fuel token and usage token is automatically calculated by the system and all these are sent to the auditor for the validation. If the submitted data is not valid and if rejected by the consultant the project developer will need to verify the data and submit it again for the review.

![][image7]  
![][image8]

* Consultant validates:  
  * Customer and stove linkage.  
  * Completeness of usage data.  
  * Exclusion of test, invalid, or duplicate entries.  
* Outcomes:  
  * Valid → proceed to tokenization.  
  * Not Valid → flagged, corrected, or discarded.

### Step 4: Token Calculation

After the approval from the consultant the next step is the token calculation. The usage and fuel tokens are calculated by the system using some predefined formulae and conditions.

* Usage Tokens: Generated from verified stove fan seconds.  
* Fuel Tokens: Generated from recorded sustainable fuel purchases.

![][image9]  
![][image10]

### 

### Step 5: Auditor Review

The next step is the review by the auditor. The approved data by the consultant can be reviewed by the auditor. Apart from the submitted data the auditor also reviews the token data which are calculated automatically based on the data submitted and if valid the auditor approves and proceeds to generate the co2 token. If not valid the project developer needs to check and submit the data again for verification.

* The auditor independently checks token data.  
* If valid, proceeds to CO₂ tokenization.  
* If not valid, tokens flagged for correction and resubmission.

![][image11]

![][image12]![][image13]

### Step 6: CO₂ Tokenization

After the approval from the auditor the CO2 token is calculated by the system.

![][image14]

### Step 7: Approval & Minting

The next step is the verification and approval of the CO2 tokens and after the approval the tokens are minted into CO2 Tonnes.

![][image15]

![][image16]

* Verified CO₂ tokens are approved for issuance.  
* Tokens are minted into CO₂ Tonnes.


[image1]: <assets/images/list_policies.png>
[image2]: <assets/images/select_role.png>
[image3]: <assets/images/add_customer.png>
[image4]: <assets/images/add_device.png>    
[image5]: <assets/images/add_shop.png>
[image6]: <assets/images/pd_submit_data.png>
[image7]: <assets/images/view_submit_data.png>
[image8]: <assets/images/submit_data_approve.png>
[image9]: <assets/images/usage_token.png>
[image10]: <assets/images/fuel_token.png>
[image11]: <assets/images/auditor_submit_data.png>
[image12]: <assets/images/auditor_usage_token.png>
[image13]: <assets/images/auditor_fuel_token.png>
[image14]: <assets/images/co2_token.png>
[image15]: <assets/images/co2_approve.png>
[image16]: <assets/images/co2_tonne.png>
