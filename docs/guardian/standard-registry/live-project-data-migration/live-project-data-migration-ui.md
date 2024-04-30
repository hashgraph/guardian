# ↔️ Live Project Data Migration UI

## 1. Exporting Policy Data

We have added button "**Export policy data**" for published policies and dry-run policies.&#x20;

By clicking you will get all policy data in the **.data** file.&#x20;

Then you can use this file for migrating data to another policy.

<figure><img src="../../../.gitbook/assets/image (593).png" alt=""><figcaption></figcaption></figure>

## 2. Importing/Exporting Keys for Dry Run Policies

We have added buttons "**Export/Import virtual keys**" for dry-run policies.&#x20;

By clicking you will get virtual user’s keys and DID Documents.&#x20;

Then you can import it in another dry-run policy, where data was migrated from current policy.

<figure><img src="../../../.gitbook/assets/image (594).png" alt=""><figcaption></figcaption></figure>

## 3. Migrating Policy State to Destination Policy

We have added "**Migrate policy state**" flag to migrate data dialog.&#x20;

When you enable it, you will migrate all policy state to destination policy (includes block states - steps, timers, multi-sign, split documents, aggregate documents, etc...)

To get information about different steps in the below migration process screen, please refer to [Migration Process](../discontinuing-policy-workflow/apis-related-to-discontinuing-policy-workflow/migratepolicy-data.md)

<figure><img src="../../../.gitbook/assets/image (595).png" alt=""><figcaption></figcaption></figure>

## 4. Change VC Document during Migration

We have added ability to change VC which will be migrated by clicking on "**Edit document**" button under operations column:

<figure><img src="../../../.gitbook/assets/image (596).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (597).png" alt=""><figcaption></figcaption></figure>
