# African Clean Energy(ACE) Policy & Guardian Workflow

The workflow focuses on the introduction and use of improved cookstoves that replace traditional, inefficient stoves. By monitoring stove use and fuel consumption, projects can demonstrate measurable reductions in greenhouse gas (GHG) emissions while also delivering social and health benefits.

This repository documents the standard procedure for collecting stove usage data, converting it into measurable carbon offsets, and managing CO₂ tokens using Salesforce, Google Cloud, and the Hedera Guardian platform.

## Key Concepts

### 1. Baseline Scenario
- Households often rely on **inefficient stoves** using non-renewable biomass fuels (e.g., wood, charcoal).
- Baseline surveys capture **fuel usage patterns**, stove types, and household characteristics.
- This baseline reflects the **traditional cooking practices** without the project.

### 2. Project Scenario
- Distribution and adoption of **improved cookstoves** with higher efficiency and lower emissions.
- Progressive adoption can occur over time.
- Each stove is tracked individually (e.g., stove serial number, household ID).

### 3. Monitoring Parameters
Projects monitor stove-related metrics including:

- **Stove usage (fan hours / fan seconds)**  
  Tracks how long stoves are actively used, ensuring proper service delivery.

- **Fuel use and fuel sales**  
  Measures how much fuel is consumed compared to baseline practices.

- **Household details**  
  Includes household size, stove ownership, and adoption rates.

- **Installation and connection dates**  
  Marks when a stove is first and last used.

- **Performance field tests (PFTs)**  
  Verify stove efficiency and real-world performance.

- **Surveys and sampling**  
  Determine usage rates, stove stacking, and sustained adoption.

### 4. Data Records
Each stove is logged with:
- **Stove serial number**  
- **Customer unique number**  
- **Fuel transaction records**  
- **Dates of installation and usage**  
- **Monitoring period details**  



## Benefits

- **Climate Impact**  
  Reduces CO₂ and other emissions from inefficient stove use.

- **Health Benefits**  
  Improves indoor air quality by reducing PM2.5 and CO exposure.

- **Social Development**  
  Saves households time and resources on fuel collection.  
  Contributes to SDG 3 (Health) and SDG 13 (Climate Action).

- **Economic Efficiency**  
  Lower household fuel costs with more efficient cookstoves.




## Overview

The system ensures transparent, verifiable, and certifiable carbon credit generation in alignment with Gold Standard or equivalent certifications.

---

## African Clean Energy(ACE) Policy Scope

The African Clean Energy(ACE) policy outlines:

- Stove usage data collection and syncing
- Data processing using BigQuery and Salesforce
- Token creation, validation, and verification
- Exporting data for external certification
- Minting and retiring CO₂ tonnes

---

## Guardian Workflow

This defines how data flows through the **Hedera Guardian** platform to issue and retire verifiable carbon credits.

![][workflow]

### Roles

- **Project Developer**: Registers customers and devices, submits onboarding and usage data.
- **Consultant**: Validates data for completeness and accuracy.
- **Auditor**: Independently reviews data and ensures compliance with certification standards.

---

## Workflow Steps

### Step 1: Data Entry

Performed by the **Project Developer**:

- **Add Customer**: Register customer in the Guardian system.
- **Device Registration**: Register stove with unique IDs.
- **Shop Onboarding**: Add details of the shop selling the stoves.

### Step 2: Data Submission

Project Developer submits:

- Usage data
- Customer and stove IDs
- Fuel sales data

### Step 3: Consultant Review

Consultant validates:

- Stove and customer linkage
- Data completeness
- Removal of invalid/test entries

**Outcomes:**

- **Valid**: Proceed to token calculation.
- **Invalid**: Returned for correction.

### Step 4: Token Calculation

Automatically calculated:

- **Usage Tokens**: From verified stove fan seconds.
- **Fuel Tokens**: From sustainable fuel sales.

### Step 5: Auditor Review

Auditor reviews:

- Submitted and consultant-approved data
- Calculated usage and fuel tokens

**Outcomes:**

- **Valid**: Proceed to CO₂ tokenization.
- **Invalid**: Returned for resubmission.

### Step 6: CO₂ Tokenization

System calculates CO₂ tokens based on approved usage and fuel data.

### Step 7: Approval & Minting

- Auditor-approved CO₂ tokens are verified.
- Tokens are minted into CO₂ Tonnes.

---

## Certification Alignment

All tokens and offsets generated follow compliance checks to ensure alignment with standards like **Gold Standard** or equivalents.

---

## Technology Stack

- **Hedera Guardian**
- **Salesforce**
- **Google Cloud / BigQuery**

---

## License

MIT License (or as applicable to your organization)


[workflow]: <assets/images/workflow.png>
