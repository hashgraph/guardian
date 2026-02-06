# Indexer User Guide

1. [Step By Step Process](indexer-user-guide.md#id-1.-step-by-step-process)
2. [Demo Video](indexer-user-guide.md#id-2.-demo-video)

## 1. Step By Step Process

Indexer provides a global search facility on the landing page, and other pages’ headers. It allows users to find information by matching string values.

For example ‘Project Description’ will find all entities which include ‘Project’ word or ‘Description’ word.

To find an exact phrase you need to use double quotes, e.g. type something like ‘“Project Description”’. Words can be excluded by typing ‘-’ symbol in the request. All searched entities have metadata in Hedera messages, search looks at policy message IDs, schema names, schema message IDs, VC/VP document content/values, schema properties, schema field names, etc…

To launch the Indexer, please run the following command in the root of the folder:

```
docker compose -f "docker-compose-indexer.yml" up -d --build
```

### **Launching Indexer**

Once the above command is successfully executed and all the docker containers are running, Indexer can be launched at [http://localhost:3005](http://localhost:3005)

{% hint style="info" %}
Please note that it would take minimum 6 hours to load complete Indexer data.
{% endhint %}

### Landing page includes following information:

* _Registries_, _Methodologies_, _Total Documents_, _Total Issuance_. All cards are clickable. Also there is an ability to check charts with count and date.
* Project Locations section : shows locations of projects on the world map, all points are clickable.

![](<../../.gitbook/assets/0 (14).png>)

![](<../../.gitbook/assets/1 (16).png>)

### Indexer UI sections:

Accounts, Methodologies, Documents, Others.

Sections have specific grids for displaying data and filters:

* Accounts:
  * Standard Registries
  * Registry Users
* Methodologies:
  * Policies
  * Tools
  * Modules
  * Schemas
  * Tokens
  * Roles
* Documents:
  * DIDs
  * VCs
  * VPs
* Others:
  * NFTs
  * Topics
  * Contracts

Example of the grid displaying data is seen on the screenshot below:

![](<../../.gitbook/assets/2 (18).png>)

Majority of the grids provide capability to search by keyword filter, which has some differences in comparison to global search. In the search failed it uses ‘chips’, i.e. type and press ENTER to add values, to search for specified items based on an AND condition.

For example, searching for. schema by typing ‘Project’ and ‘Description’ will find all schemas which contain ‘Project’ and ‘Description’ strings.

![](<../../.gitbook/assets/3 (15).png>)

Each grid includes special details page:

* Standard Registry details page have following tabs:
  * Overview - a common information.
  * Activity - activity of SR (VCs, VPs, Policies, Roles, Tools, Modules, Tokens, Users). All activity cards are clickable and it will navigate the user to the appropriate grid with correctly applied filters.

![](<../../.gitbook/assets/4 (13).png>)

* Raw Data - raw message data.

![](<../../.gitbook/assets/5 (16).png>)

* Policy details page have the following tabs:
  * Overview - general information with link to Standard Registry.

![](<../../.gitbook/assets/6 (15).png>)

* Activity - activity in policy (VCs, VPs, Roles, Creating schemas). All activity cards are clickable and it will navigate you to the appropriate table with necessary filters.
* Raw Data - raw message data.

Tool details has the following tabs:

* Overview - a common information.
* Content- content of Tool (Using in policies, Tool Schemas). All content cards are clickable and it will navigate you to the appropriate table with necessary filters.
* Raw Data - raw message data.

Module details has the following tabs:

* Overview - a common information.
* Raw Data - raw message data.

Schema details has the following tabs:

* Overview - a common information with link to policy.
* Document - schema document data.
* Tree - schema tree. All nodes here are clickable, upon clicking they open the associated schema pages.

![](<../../.gitbook/assets/7 (15).png>)

* Activity - schema activity (VCs, VPs)
* Raw Data - raw message data.

Token details has the following tabs:

* Overview - a common information with link to NFTs.
* Raw Data - raw token data.

Role details has the following tabs:

* Overview - a common information with link to policy.
* Activity - role activity (VCs)
* Raw Data - raw message data.

DID details has the following tabs:

* Overview - a common information.
* Document - DID Document
* Raw Data - raw token data.

VC details has the following tabs:

* Overview - a common information with link to policy.
* Document - VC document data. It can be represented in two forms JSON and Document form.

![](<../../.gitbook/assets/8 (16).png>)

<figure><img src="../../.gitbook/assets/image (801).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (802).png" alt=""><figcaption></figcaption></figure>

* History - document history since it was created.
* Relationships - document relationships with links to policy, roles, schemas, standard registry, other documents.

<figure><img src="../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

* Raw Data - raw message data.

VP details includes following tabs:

* Overview - a common information with link to policy.
* Document - VP document data.
* History - document history since it was created.
* Relationships - document relationships with links to policy, roles, schemas, standard registry, other documents.

![](<../../.gitbook/assets/10 (15).png>)

* Raw Data - raw message data.

NFT details includes following tabs:

* Overview - a common information.
* History - NFT transactions history since it was minted
* Labels - Labels involved in NFT.
* Raw Data - raw NFT data.

Topic details includes following tabs:

* Overview - a common information with link to parent topic Id.
* Content - topic content with all entity types such as VCs, VPs, Schema, Policies, Tools, Modules, DIDs, Contracts, etc…
* Raw Data - raw topic data.

Synchronization of all entity data starts one time per hour, but it can be changed by changing environment variables.

### 1.1 Handling Local Node Files:

For documents (VC, VP, DID, Schema) with local CIDs (i.e. Such documents were uploaded onto local IPFS nodes) Guardian attempts to automatically download the file when user attempts to open in in the Indexer UI. This may not be possible if the local node is ‘closed’ for outside requests. For such cases there is also an option for the user to manually attempt to download from the local IPFS node. This can be retried unlimited number of times, for situations when local node administrators open access to the node\[s] at a later date.

<figure><img src="../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:** This functionality requires the correct setting for the IPFS\_GATEWAY configuration option in the `indexer-service .env` file:

**For example:** `IPFS_GATEWAY="https://ipfs.io/ipfs/${cid}"`
{% endhint %}

### 1.2 Priority Loading Data Queue:

As Hedera network have lots of data available, it would take some time to load it completely in indexer, hence, now we would now be able to prioritize the documents/topics/policies/tokens.

<figure><img src="../../.gitbook/assets/image (829).png" alt=""><figcaption></figcaption></figure>

We would be able to add it to the priority queue by clicking on the checkbox and adding it to the queue as shown below:

<figure><img src="../../.gitbook/assets/image (830).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (831).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (832).png" alt=""><figcaption></figcaption></figure>

## 2. Demo Video

[Youtube](https://youtu.be/TciXNvx1kcQ)
