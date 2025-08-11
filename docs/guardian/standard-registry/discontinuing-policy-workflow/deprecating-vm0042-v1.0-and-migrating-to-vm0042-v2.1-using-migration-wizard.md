# Deprecating VM0042 v1.0 and Migrating to VM0042 v2.1 Using Migration Wizard

## Background

An environmental carbon credit registry is using the VM0042 methodology for _Improved Agricultural Land Management_.\
The current Guardian policy is based on VM0042 v1.0, which has been in use since 2023.

In July 2025, Verra released VM0042 v2.1, which introduces:

* Updated emission factor calculation formulas
* New soil organic carbon (SOC) sampling schema
* Mandatory geospatial boundaries in GeoJSON format
* Additional MRV (Monitoring, Reporting, and Verification) metadata fields

To comply with updated standards, the registry must:

1. Deprecate VM0042 v1.0 so no new projects start on it.
2. Migrate existing project data to VM0042 v2.1 using Guardian’s Migration Wizard.

### Why Migration Is Needed

* Regulatory compliance — Old methodology no longer meets Verra’s validation requirements.
* Data consistency — All ongoing projects must follow the same updated schema for comparability.
* Avoid double counting — Ensures migrated projects retain unique identifiers and traceable history.

### Part 1: Deprecate VM0042 v1.0 Policy

#### Step 1: Open Guardian Admin Panel

Navigate to the **"Policies"** section in the Guardian dashboard.

<figure><img src="../../../.gitbook/assets/image (109).png" alt=""><figcaption></figcaption></figure>

#### Step 2: Select Policy to Deprecate

Click on `VM0042 v1.0` to open the policy details.

<figure><img src="../../../.gitbook/assets/image (115).png" alt=""><figcaption></figcaption></figure>

#### Step 3: Deprecate the Policy

* Click the **"Discontinue"** button.

<figure><img src="../../../.gitbook/assets/image.png" alt=""><figcaption></figcaption></figure>

* Select the timeframe, when we want to discontinue the policy. For now, we will be selecting immediate in the pop up:

<figure><img src="../../../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

* The policy will now be marked as **Discontinued**, and users will no longer be able to issue new credentials.

<figure><img src="../../../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

### Part 2: Prepare VM0042 v2.1 Policy

#### Step 5: Create/Import VM0042 V2.1 Policy:

<figure><img src="../../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

Publishing VM0042 V2.1 Policy:

<figure><img src="../../../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

### Part 3: Migrate Data Using Migration Wizard

#### Step 6: Launch Migration Wizard

* Click on **Migrate data** for Discontinued Policy: VM0042 v1.0:

<figure><img src="../../../.gitbook/assets/image (5).png" alt=""><figcaption></figcaption></figure>

#### Step 7: Select Source and Target Policies

* **Source Policy**: Select Verra VM0042 Policy
* **Target Policy**: Select VM0042 V2.1

<figure><img src="../../../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

#### Step 8: Map Credentials

The wizard will show a list of issued credentials under v1.0.

* Select the credentials to migrate.
* Click **"Next"**.

<figure><img src="../../../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

#### Step 9: Map Fields to New Schema

The wizard will guide you to map old fields to the new schema structure.

<figure><img src="../../../.gitbook/assets/image (11).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (12).png" alt=""><figcaption></figcaption></figure>

#### Step 10: Map the Roles

* Map the roles:

<figure><img src="../../../.gitbook/assets/image (13).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (14).png" alt=""><figcaption></figcaption></figure>

#### Step 11: Map the Groups/Tokens (Optional)

#### Step 12: Start the Migration Process

* Click on "Next" and start the migration data process:

<figure><img src="../../../.gitbook/assets/image (15).png" alt=""><figcaption></figcaption></figure>

#### Step 13: Verify the VM0042 V2.1 Policy

* Open the VM0042 V2.1 Policy and click on "**TrustChain**"

<figure><img src="../../../.gitbook/assets/image (16).png" alt=""><figcaption></figcaption></figure>

