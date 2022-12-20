# 🛣 Roadmap

To get more information on Roadmap, please click: [https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/roadmap?invite=true](https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/roadmap?invite=true)

### ----August 2022----

* **Dry Run for Guardian Operations**

This will target the problem that the users have no ways to estimate the effect of various actions they take via the API or UI. It'd be a useful feature, in particular for estimating the ability to pay for the blockchain transactions.

Referral Link : [https://github.com/hashgraph/guardian/issues/1035](https://github.com/hashgraph/guardian/issues/1035)

* **Multi-User Roles**

This will target the problem that in the enterprise setting multiple individuals can be performing the same role interchangeably - at the same time or staggered on the timeline (holidays, re-assignments, sick leaves etc). Currently Guardian policy flow requires an individuals assigned/configured to the task to perform it, in the business setting it would mean delays if these individuals are absent.Also, for some actions it may be required to involve multiple users (from the group) to 'sign'/attest to something.

Referral Link : [https://github.com/hashgraph/guardian/issues/1013](https://github.com/hashgraph/guardian/issues/1013)

### ----September 2022----

* **HashiCorp Implementation**

This will target the problem that the keys are stored in plaintext in the environment or in Mongo and displayed in the UI. As the Guardian default deployment is open this represents a significant security risk for applications deployed to production. Suggestions in our weekly call have been around the implementation of HashiCorp Vault in-cluster to be able to manage these secrets rather than the existing mechanism.

Referral Link : [https://github.com/hashgraph/guardian/issues/954](https://github.com/hashgraph/guardian/issues/954)

### ----October 2022----

* **Migration Guide**

This will target the problem situation where, for example, a Guardian instance is to be de-commissioned, there is currently no pathway to migrate all the Standard Registries' (SRs) data associated with the instance other than simply replicating the installation elsewhere (i.e. by performing backup/restore the DB). Decentralized nature of Guardian should allow for restoration of any or all SRs data on an arbitrary instance using only decentralized sources (IPFS, Hedera) with the exception of keys which should be restorable from a backup.

Referral Link : [https://github.com/hashgraph/guardian/issues/462](https://github.com/hashgraph/guardian/issues/462)

* **Multi-Policy Coverage**

This will target the problem in Guardian that there is a 1-to-many relationship between Policy and projects. If a project wants to conform to two or more policies such as Verra and Gold Standard REDD+ from separate "Methodologies" to increate the attractiveness (e.g. 'higher quality') of the minted token. there is no way to avoid double counting.

Referral Link :  [https://github.com/hashgraph/guardian/issues/228](https://github.com/hashgraph/guardian/issues/228)

* **API Automation Test Suite**

This will target the problem where we need to implement the automation of API Tests using Cypress framework.

Referral Link : [https://github.com/hashgraph/guardian/issues/785](https://github.com/hashgraph/guardian/issues/785)

### ----November 2022----

* **Multi-Modular Benefit Projects**&#x20;

This will target the problem that the projects can feature multiple Modular Benefit Project (MBP) potentially under different policies, producing different types of tokens.

Referral Link : [https://github.com/hashgraph/guardian/issues/1014](https://github.com/hashgraph/guardian/issues/1014)

* **QA Disaster Recovery Testing**&#x20;

This will target the problem in the event of a catastrophic failure of systems there is currently no defined way to restore Guardian operation.

Referral Link : [https://github.com/hashgraph/guardian/issues/362](https://github.com/hashgraph/guardian/issues/362)

* **Developer-Level UI Automation Test**&#x20;

This will target the problem where we need to implement the automation for UI using Cypress framework.

Referral Link : [https://github.com/hashgraph/guardian/issues/786](https://github.com/hashgraph/guardian/issues/786)

### ----December 2022----

* **MVP of Retirement Process for Assets**&#x20;

This will target the problem that as a user of the Guardian, I would like a retirement process for ESG assets. This is the other end of the token lifecycle, opposite to the 'creation' process, which also needs its own ruleset.

Assets may include:

* Carbon Emission Tokens (CET)
* Carbon Removal Units (CRU)
* Core Carbon Principals (CCP)

Referral Link : [https://github.com/hashgraph/guardian/issues/55](https://github.com/hashgraph/guardian/issues/55)

* **Matched Assets**&#x20;

This will target the problem when various sustainability-related tokens are created by the Guardian in compliance with a particular policy they can have a relationship with other tokens created by:

* a different version of the same policy (most of the time the relationship is of equivalence)
* a different policy of the same Root Authority
* a different policy of a different Root Authority

The type of the relationship can be:

* equivalence (they are 'the same', i.e. substitutable for one another)
* opposite equivalence - 'matched assets' (they are exactly the opposite, i.e. they can cancel each other)
* a variations of the above with the 'exchange rate' (e.g. 1 tokens of one type can be 'cancelled' by 2 tokens of the other type).

Referral Link : [https://github.com/hashgraph/guardian/issues/290](https://github.com/hashgraph/guardian/issues/290)

### ----January 2023----

* **Policy Differentiation Feature**

This will target the problem that different Standard Registries (SRs) can be managing policies of varying degree of compatibility, issuing tokens as a result. Policies could be essentially the same and vary in version, or differ in various parts including accounting methods. SRs themselves can be of different degree of 'trustworthiness' and reputation. Participants in the ecological market currently have no way of establishing the relative status of policies issued by different or the same SR at different stages.

Referral Link : [https://github.com/hashgraph/guardian/issues/85](https://github.com/hashgraph/guardian/issues/85)

* **Library of Policy Examples**&#x20;

This will target the problem where there are common scenarios in various policies, which should be reflected in common patters of usage of policy elements. These are currently present (to some degree), but hidden behind the complexity of the large Policy documents.

Referral Link : [https://github.com/hashgraph/guardian/issues/1012](https://github.com/hashgraph/guardian/issues/1012)

* **ESG Scorecards**&#x20;

This will target the problem that market participants who are planning to consume some of the minted tokens are currently unable to inform the market about the future demand. Ability to do so would stimulate the market, giving it liveliness and ensuring investment into the environmental projects.

Referral Link : [https://github.com/hashgraph/guardian/issues/1017](https://github.com/hashgraph/guardian/issues/1017)

* **Mitigation Credits**&#x20;

This will target the problem that non-offset GHG reductions, such as those resulting from corporate energy conservation or efficiency initiatives, are currently not supported in Guardian. These are generally measured as the delta between the baseline and current emission levels, there are no concepts/tools which would allow Guardian users to account for these, and link/reflect them on the ESG scorecards.

Referral Link : [https://github.com/hashgraph/guardian/issues/54](https://github.com/hashgraph/guardian/issues/54)

* **Real-World MRV Accounting**&#x20;

This will target the problem Deeper analysis of the example of projects aiming to be conformant with iREC or VERRA that current data aggregation functionality may not be sufficient for the real world:

* MRVs frequently need to be augmented by information from external sources
* The decision about minting tokens may involve non-numerical decision criteria and complex logic
* The logic can be context dependent, for example based on whether some external event has taken place

Referral Link : [https://github.com/hashgraph/guardian/issues/1018](https://github.com/hashgraph/guardian/issues/1018)

* **Third-Party Content Providers**&#x20;

This will target the problem that the process of 'executing' a policy Guardian can receive and make use of two types of external data:

* MRVs from sensors (automatically) or inputted via the form by a human.
* Information submitted (by humans) via form data, e.g. when registering a project.

There are many use-cases when additional external data may need to be associated with MRV data sets, artifacts of policy execution, and/or tokens.

Referral Link : [https://github.com/hashgraph/guardian/issues/229](https://github.com/hashgraph/guardian/issues/229)

* **Soak Testing**&#x20;

This will target the problem that Guardian instances are only used consistently for a relatively short time period. There is no knowledge of whether the system will degrade performance in any way after multiple days/weeks of consistent load.

Referral Link : [https://github.com/hashgraph/guardian/issues/1011](https://github.com/hashgraph/guardian/issues/1011)

* **Automated Compatibility Testing**&#x20;

This will target the problem that Guardian API follows [API Versioning and Deprecation Policy](https://docs.hedera.com/guardian/versioning-and-deprecation-policy/api-versioning-and-deprecation-policy). It's adherence to the policy, especially for backward compatibility/regression problems, is difficult to verify as there are currently no developed automated tools and processes.

Referral Link : [https://github.com/hashgraph/guardian/issues/1010](https://github.com/hashgraph/guardian/issues/1010)

* **Scalability and Capacity Testing**&#x20;

This will target the problem that Guardian is required to operate at the 'enterprise-level', potentially handling large numbers of users, documents and transactions. At present there are no quantitative data about its ability to fulfill this requirement, and therefore no strategy or best practices can be developed for scaling the solution for different use-cases.

Referral Link : [https://github.com/hashgraph/guardian/issues/36](https://github.com/hashgraph/guardian/issues/36)

* **DEX Contract and Policy Rules for Matching/Retiring Assets**

This will target the problem that ESG market participants need ability to 'reconcile' two sides of the environmental balance sheet, i.e. to match and retire pairs of assets they own.&#x20;

Referral Link : [https://github.com/hashgraph/guardian/issues/1039](https://github.com/hashgraph/guardian/issues/1039)
