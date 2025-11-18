# Live Project Data Migration UI

1. [Step By Step Process](live-project-data-migration-ui.md#id-1.-step-by-step-process)
2. [Demo Video](live-project-data-migration-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## 1. Exporting Policy Data

Data migration feature allows transfer of some or all policy artefacts and/or state into another policy (on the same of different Guardian instance) by exporting into and then importing the .data file.

To perform export press ‘**Export policy data**’ option in the Policy menu.

The operation is available for dry-run and published policies.

<figure><img src="../../../.gitbook/assets/image (593).png" alt=""><figcaption></figcaption></figure>

## 2. Importing/Exporting Keys for Dry Run Policies

To export/import virtual users’ keys and DID documents for dry-run policies press the corresponding ‘**Export virtual keys**’ or ‘**Import virtual keys**’ menu options.

They can be imported into another dry-run policy, where data was migrated from the current policy.

<figure><img src="../../../.gitbook/assets/image (593) (1).png" alt=""><figcaption></figcaption></figure>

## 3. Migrating Policy State to Destination Policy

If Policy state flag is set in the ‘**Migrate Data**’ dialog, the entire policy state gets migrated into the destination policy.

This includes block states - steps, timers, multi-signs, split documents, aggregate documents, etc...

To get information about different steps in the below migration process screen, please refer to [Migration Process](../discontinuing-policy-workflow/apis-related-to-discontinuing-policy-workflow/migratepolicy-data.md)

<figure><img src="../../../.gitbook/assets/image (595).png" alt=""><figcaption></figcaption></figure>

## 4. Migrate Retire Pools

When ‘Migrate retire pools’ flag is selected, the migration process will re-create all selected existing retirement pools, from all contracts created by the ‘current’ instance, in the new retirement contract. The UI allows the user to map policy tokens and select the new retire contract.

<figure><img src="../../../.gitbook/assets/image (603).png" alt=""><figcaption></figcaption></figure>

## 5. Change VC Document during Migration

We have added ability to change VC which will be migrated by clicking on "**Edit document**" button under operations column:

<figure><img src="../../../.gitbook/assets/image (596).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (597).png" alt=""><figcaption></figcaption></figure>

When state migration is selected block mapping could be used to optimize the migrations.

<figure><img src="../../../.gitbook/assets/image (604).png" alt=""><figcaption></figcaption></figure>

For Policies with dynamic tokens mapping of token templates might be required.

<figure><img src="../../../.gitbook/assets/image (602) (1).png" alt=""><figcaption></figcaption></figure>

## 2. Demo Video

[Youtube](https://youtu.be/stSudc82pZU?si=Nsv6RyM6I_NpRvwE\&t=110)
