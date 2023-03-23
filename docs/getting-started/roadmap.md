# 🛣 Roadmap

To get more information on Roadmap, please click: [https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/roadmap?invite=true](https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/roadmap?invite=true)

### ----February 2023----

* ## Linkable policy modules for constructing end-to-end Policy workflows

Create a facility to define 'higher-order' (than blocks) Policy constructs thus enabling the creation of pre-build policy modules which can then be linked together to compose end-to-end policies, without needing to understand the low-level details of 'blocks' and 'events'. The following are other constraints/parameters of this functionality:

* modules have clearly defined purpose and function
* modules have API specification, i.e. ingress and egress events and documents they consume/produce
* modules are published with attribution of the source/author, can be 'imported' and 'exported' from Guardian instance
* modules can be run on separate 'workers/services' within a single logical Guardian instance, enabling optimal scalability setup (i.e. 1a single instance of the module running in one small-powered service for 'onboarding projects', and multiple 'MRV processing' module instances for aggregating data and minting tokens.

Referral Link : [https://github.com/hashgraph/guardian/issues/1657](https://github.com/hashgraph/guardian/issues/1657)

### ----March 2023----

* ## Running multiple instance of services in HA environment

All heavy process backend service need to be able to run load balancing and handle task lock.

Referral Link : [https://github.com/hashgraph/guardian/issues/1454](https://github.com/hashgraph/guardian/issues/1454)

* ## Selective Disclosure support in VC data

Introduce the following functionality in the Guardian:

* Facilities to mark some fields as private (in schema)
* VC documents based on the schema with 'private' fields **do not** get published as is, instead they are encrypted with the owner key and published encrypted
* VC documents with 'private' fields use BBS signature `BbsBlsSignature2020` method instead of `Ed25519Signature2018`
* VPs derived from VC documents with private fields will contain 'cut down' VC only containing public field, signed by the BBS signature as per above.

Referral Link : [https://github.com/hashgraph/guardian/issues/1633](https://github.com/hashgraph/guardian/issues/1633)\


### ----April  2023----

* ## Guidance for open-sourcing Policies for easy QA/testing

Design and implement the process for submitting 'supportable' policies containing:

* Policy user guide and description
* Automated policy workflow, with valid sample MRV data or MRV data generator/simulator
* IPFS timestamps, .policy files
* Requirement to run tests before sending Guardian the policy, including backward compatibility tests

Referral Link : [https://github.com/hashgraph/guardian/issues/1662](https://github.com/hashgraph/guardian/issues/1662)

* ## Tagging of Guardian policy artifacts

Create a tagging system with the following properties:

* tags can be created by any actor with a valid DID.
* created tags should be credentialed, i.e. it is clear who and when created or added to a particular tag.
* tags can have cumulative scores, i.e. two people independently creating/assigning the same tag to the same artifact results in both tagging actions recorded (credentialed etc), and the 'tag score' is then counted as 2.
* It is possible for users to untag the item, however this action does not remove the record of tagging in the first place it just records the action of untagging (also credentialed), and reduces to score by 1.
* tags should be associate-able with any identifiable entity/thing/artifact that guardian uses and/or produces, such as:
  * actors, including SRs (i.e. DIDs),
  * schemas
  * policies and policy modules
  * VCs/VPs,
  * tokens,
  * smart contracts (i.e. addresses).
* tags can be created after the (immutable) artifacts are produced, therefore tags are external to artifacts.
* it should be possible for DIDs to create and/or follow tag ontologies containing the definition of description of tags.
* tag registry\[-ies] should be discoverable and useable by automated indexing systems.

Referral Link :  [https://github.com/hashgraph/guardian/issues/1661](https://github.com/hashgraph/guardian/issues/1661)

### ----May 2023----

* ## Integrate with external data sources
* Support the use, from inside the policy, of VCs/VPs produced by other Guardian instances published in IPFS.
* Support other Guardian instances' APIs as sources of the data
* Support integration with [Agryo](https://www.agryo.com/)
* Support integration with Google geo-location API
* Implement integration with these 3rd party data providers (may be similar to IPFS/Hedera integration), such as:
  * policy can easily add such 'integration' to their policy - potentially using the new policy modules functionality [Linkable policy modules for constructing end-to-end Policy workflows #1657](https://github.com/hashgraph/guardian/issues/1657)
  * the data can be defined as mandatory or optional (by the policy author)
  * data imported into Policy artefacts is stored and displayed in its native format, preserving 'mime type' and/or any other indication of the nature of the data as well as the identity/credentials of the source, time/date and other identifying information as appropriate

Referral Link : [https://github.com/hashgraph/guardian/issues/1658](https://github.com/hashgraph/guardian/issues/1658)

* ## Enhancing/Improving Policy Creation
* Continue working on enhancing policy definition language to enable new capabilities in policies
* Re-engineer policy creation workflow to simplify the tooling for non-programmer users potentially using such approaches as
  * wizard-base workflow
  * data definition enhancements in schemas enabling more precise specification of expected data formats
  * support for new data types (like 'spatial' etc) which are useful specifically in the ESG domain.
  * auto-suggestion mechanism (for 'next' block or other policy language constructs) based on the structure of existing policies
  * syntax highlighting of JSON policy definition view
* Add new reference UI tools that would simplify comprehension of policy and its execution results for complex use-cases such as those with multi-benefit projects with multiple tokens and multiple MRV sources

Referral Link : [https://github.com/hashgraph/guardian/issues/1655](https://github.com/hashgraph/guardian/issues/1655)

### ----June 2023----

* ## Enhancement to Methodology Comparison Tool

Policy comparison tool to be adapted and enhanced to recognize the linked policy modules and display useful differences, statistic and analysis for compared policy instances.

Referral Link : [https://github.com/hashgraph/guardian/issues/1660](https://github.com/hashgraph/guardian/issues/1660)

* ## GHGP Corporate Standard Policy

Develop and demo a Guardian policy that allows companies to mint CETs and develop GHGP-compliant tokenized GHG inventories.

Referral Link : [https://github.com/hashgraph/guardian/issues/1666](https://github.com/hashgraph/guardian/issues/1666)

### ----July 2023----

* ## Guardian Oracle service to verify token trust chain from within Hedera smart contracts

Develop a Guardian 'Oracle' service to produce (at least) a verifiable binary valid/not valid answer for a given token or group of tokens reachable from within the smart contract, which can then form the basis conditional operation inside the smart contract.

Referral Link : [https://github.com/hashgraph/guardian/issues/1040](https://github.com/hashgraph/guardian/issues/1040)

* ## On-chain carbon token lifecycle rules enforcement

Using a combination of HTS and HSCS capabilities develop a consistent system which enable policy creators to specify rules and parameters of the minted token lifecycle such that:

* rules are enforced regardless of whether Guardian is used or not for token management
* rules and their parameters can be changed by the SR that originally minted the token
* anyone can create additional sets of rules and any holder of the token can agree to follow them, thereby imposing on yourself these additional rules. Such rules cannot overwrite the original SR rules, the validation is effectively performed in a sequence:
  * additional rules applied for validation of the attempted action
  * SR rules applied

Referral Link : [https://github.com/hashgraph/guardian/issues/1659](https://github.com/hashgraph/guardian/issues/1659)

* ## HBAR GHG Policy

Create a Guardian policy that quantifies and reports GHG emissions from HBAR, using the GHGP product Standard and ICT Sector Guidance for guidance and requirements mapping.

[https://ghgprotocol.org/sites/default/files/standards/Product-Life-Cycle-Accounting-Reporting-Standard\_041613.pdf](https://ghgprotocol.org/sites/default/files/standards/Product-Life-Cycle-Accounting-Reporting-Standard\_041613.pdf)\
[https://ghgprotocol.org/sites/default/files/GHGP-ICTSG%20-%20ALL%20Chapters.pdf](https://ghgprotocol.org/sites/default/files/GHGP-ICTSG%20-%20ALL%20Chapters.pdf)

Referral Link : [https://github.com/hashgraph/guardian/issues/1667](https://github.com/hashgraph/guardian/issues/1667)
