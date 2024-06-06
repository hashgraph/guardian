# 💻 Indexer User Guide

Indexer provides a global search facility on the landing page, and other pages’ headers. It allows users to find information by matching string values.&#x20;

For example ‘Project Description’ will find all entities which include ‘Project’ word or ‘Description’ word.&#x20;

To find an exact phrase you need to use double quotes, e.g. type something like ‘“Project Description”’. Words can be excluded by typing ‘-’ symbol in the request. All searched entities have metadata in Hedera messages, search looks at policy message IDs, schema names, schema message IDs, VC/VP document content/values, schema properties, schema field names, etc…

### Landing page includes following information:

* _Registries_, _Methodologies_, _Total Documents_, _Total Issuance_. All cards are clickable. Also there is an ability to check charts with count and date.
* Project Locations section : shows locations of projects on the world map, all points are clickable.

![image4.png](<../../.gitbook/assets/0 (14).png>)

![image8.png](<../../.gitbook/assets/1 (16).png>)

### Indexer UI sections:&#x20;

Accounts, Methodologies, Documents, Others.&#x20;

Sections have specific grids for displaying data and filters:

*   Accounts:

    * Standard Registries
    * Registry Users


*   Methodologies:

    * Policies
    * Tools
    * Modules
    * Schemas
    * Tokens
    * Roles


*   Documents:

    * DIDs
    * VCs
    * VPs


* Others:
  * NFTs
  * Topics
  * Contracts

Example of the grid displaying data is seen on the screenshot below:

![](<../../.gitbook/assets/2 (18).png>)

Majority of the grids provide capability to search by keyword filter, which has some differences in comparison to global search. In the search failed it uses ‘chips’, i.e. type and press ENTER to add values, to search for specified items based on an AND condition.&#x20;

For example, searching for. schema by typing ‘Project’ and ‘Description’ will find all schemas which contain ‘Project’ and ‘Description’ strings.

![image10.png](<../../.gitbook/assets/3 (15).png>)

Each grid includes special details page:

* Standard Registry details page have following tabs:
  * Overview - a common information.
  * Activity - activity of SR (VCs, VPs, Policies, Roles, Tools, Modules, Tokens, Users). All activity cards are clickable and it will navigate the user to the appropriate grid with correctly applied filters.

![image6.png](<../../.gitbook/assets/4 (13).png>)

* Raw Data - raw message data.

![image11.png](<../../.gitbook/assets/5 (16).png>)

* Policy details page have the following tabs:
  * Overview - general information with link to Standard Registry.

![image7.png](<../../.gitbook/assets/6 (15).png>)

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

![image1.png](<../../.gitbook/assets/7 (15).png>)

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

![image2.png](<../../.gitbook/assets/8 (16).png>)

* History - document history since it was created.
* Relationships - document relationships with links to policy, roles, schemas, standard registry, other documents.

![image9.png](<../../.gitbook/assets/9 (14).png>)

* Raw Data - raw message data.

VP details includes following tabs:

* Overview - a common information with link to policy.
* Document - VP document data.
* History - document history since it was created.
* Relationships - document relationships with links to policy, roles, schemas, standard registry, other documents.

![image5.png](<../../.gitbook/assets/10 (15).png>)

* Raw Data - raw message data.

NFT details includes following tabs:

* Overview - a common information.
* History - NFT transactions history since it was minted
* Raw Data - raw NFT data.

Topic details includes following tabs:

* Overview - a common information with link to parent topic Id.
* Content - topic content with all entity types such as VCs, VPs, Schema, Policies, Tools, Modules, DIDs, Contracts, etc…
* Raw Data - raw topic data.

Synchronization of all entity data starts one time per hour, but it can be changed by changing environment variables.
