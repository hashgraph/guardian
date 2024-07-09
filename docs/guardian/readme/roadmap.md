# 🛣️ Roadmap

To get more information on Roadmap, please click: [https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/roadmap?invite=true](https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/roadmap?invite=true)

## ---- January 2024----

## UI upgrade, AI search and project comparison

1. Improving Guardian UI by adding more UI elements and also adding more colorful headers which can be customized.
2. Creating a static landing page which will have capability of performing project comparison within same instance using different parameters such as scale size, sectoral scopes, etc.
3. Implementing AI search for allowing Project developers to search policies as per the information entered.
4. Implementing Guider Search for allowing project developers to search policies using different parameters within same instance.
5. Implementation of property field when schema is created, which will be used for standardizing as per IWA specification.

Referral Link: [https://github.com/hashgraph/guardian/issues/2850](https://github.com/hashgraph/guardian/issues/2850)

Documentation Link :&#x20;

{% embed url="https://docs.hedera.com/guardian/guardian/users/ai-search" %}

{% embed url="https://docs.hedera.com/guardian/guardian/users/guided-search-of-methodologies" %}

### Implement discontinuing policy workflow

Implement the policy deprecation workflow which includes:

* Guardian UI allowing issuing SR to discontinue a policy (version) or the entire policy from a certain date (in the future or 'now').
* Policy grid should display a suitable marker against non-active policies, and a different for the ones soon expiring.
* An appropriate message posted in the corresponding Hedera topic recording the 'discontinuing' decision
* For in-progress projects that have been registered and are operating under the policy it should be possible to 'switch' to the appropriate version of the policy which is still valid.

Referral Link : [https://github.com/hashgraph/guardian/issues/2030](https://github.com/hashgraph/guardian/issues/2030)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/discontinuing-policy-workflow](https://docs.hedera.com/guardian/guardian/standard-registry/discontinuing-policy-workflow)

### Gold Standard’s Carbon Sequestration through Accelerated Carbonation of Concrete Aggregate Webinar

* Design schemas for the Carbon Sequestration through Accelerated Carbonation of Concrete Aggregate methodology, create a PowerPoint presentation, and conduct webinar.
* Development of the policy using the schemas and workflow designed

Referral Link : [https://github.com/hashgraph/guardian/issues/2321](https://github.com/hashgraph/guardian/issues/2321)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/gold-standard-carbon-sequestration-through-accelerated-carbonation-of-concrete-aggregate](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/gold-standard-carbon-sequestration-through-accelerated-carbonation-of-concrete-aggregate)

### Business User Policy Development Feature - schemas MVP

* Create a excel 'schema representation' standard suitable for non-technical users. _Note: use existing excel schemas from Tools and UNFCCC initiatives as guidance._
* Create an explicit template for the above, downloadable from Guardian UI, which users can take and update/change to develop new schemas.
* Create an Export/Import UI and tooling which would allow seamless transformation of schemas written in Excel into valid Guardian JSON schemas and vice versa
* Ensure manual interventions are possible for corrections/adjustments of complex formulas and other issues.

Referral Link : [https://github.com/hashgraph/guardian/issues/1885](https://github.com/hashgraph/guardian/issues/1885)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/import-export-in-excel](https://docs.hedera.com/guardian/guardian/standard-registry/import-export-in-excel)

### Geographic raster imagery support in Guardian

Introduce support for geoTIFF and other raster types of data such that:

* Guardian documents (i.e. in schemas) can reference raster data (in geoTIFF and other common formats) which are located on external (3rd party) systems.
* Guardian UI can display raster images and their georeferencing data when they are encountered in documents.
* Guardian policy can access and manipulate (use in calculations, etc) data from raster sources.

Referral Link : [https://github.com/hashgraph/guardian/issues/1930](https://github.com/hashgraph/guardian/issues/1930)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/schemas/creating-system-schema-using-ui](https://docs.hedera.com/guardian/guardian/standard-registry/schemas/creating-system-schema-using-ui)

### Development of ACM0007: Conversion from Single Cycle to Combined Cycle Power Generation

Designing of the Schema and getting it approved. Development of the policy using Schema Development of all the tools involved in the policy:

* Tool 02- Combined tool to identify the baseline scenario and demonstrate additionality
* Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
* Tool 07- Tool to calculate the emission factor for an electricity system
* Tool 10- Tool to determine the remaining lifetime of equipment

Referral Link : [https://github.com/hashgraph/guardian/issues/2883](https://github.com/hashgraph/guardian/issues/2883)

Documentation Link :  [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0007-conversion-from-single-cycle-to-combined-cycle-power-generation](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0007-conversion-from-single-cycle-to-combined-cycle-power-generation)

## ---- February 2024----

### Support externally controlled DIDs with keys in Guardian

Introduce a workflow into the Guardian where a DID Controller would introduce a dedicated verification method into the main DID for which the private key would be stored and managed by a Guardian instance. This way Guardian would only be able to control the specific verification method's key, but not the rest of the DID.

Referral Link : [https://github.com/hashgraph/guardian/issues/2678](https://github.com/hashgraph/guardian/issues/2678)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/bring-your-own-dids](https://docs.hedera.com/guardian/guardian/standard-registry/bring-your-own-dids)

### Development of AMS-I.D: Grid Connected Renewable Electricity Generation – v.18.0

Designing of the Schema and getting it approved.\
Development of the policy using Schema\
Development of all the tool involved in the policy

Referral Link : [https://github.com/hashgraph/guardian/issues/2919](https://github.com/hashgraph/guardian/issues/2919)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/ams-i.d-grid-connected-renewable-electricity-generation-v.18.0](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/ams-i.d-grid-connected-renewable-electricity-generation-v.18.0)

### Mitigation Credits Research

Introduce the ability to mint Mitigation Asset Type tokens as the result of the calculation of the diff between planned (and reported on the Environmental) and actual results of the calculations based on the MRV data for a reporting period. This would likely require:

* New type of blocks in the policy definition language specifying 'target' numbers.
* Policy Engine ability to mint different types of tokens depending on the conditions
* Needs to be linked with [GHG scorecards Research #1017](https://github.com/hashgraph/guardian/issues/1017) logic

Referral Link : [https://github.com/hashgraph/guardian/issues/54](https://github.com/hashgraph/guardian/issues/54)

### Development of AMS-II.J.: Demand-Side Activities for Efficient Lighting Technologies

1. Designing of the Schema and getting it approved. Development of the policy using Schema
2. Development of all the tool involved in the policy:
   * Tool 07- Tool to calculate the emission factor for an electricity system

Referral Link : [https://github.com/hashgraph/guardian/issues/2885](https://github.com/hashgraph/guardian/issues/2885)

Documentation Link :  [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-ii.j.-demand-side-activities-for-efficient-lighting-technologies](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-ii.j.-demand-side-activities-for-efficient-lighting-technologies)

### Development of AMS-III.AV.: Low Greenhouse Gas Emitting Safe Drinking Water Production Systems

1. Designing of the Schema and getting it approved.
2. Development of the policy using Schema
3. Development of all the tools involved in the policy:
   * Tool 01- Tool for the demonstration and assessment of additionality
   * Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 19- Demonstration of additionality of microscale project activities
   * Tool 21- Demonstration of additionality of small-scale project activities 
   * Tool 30- Calculation of the fraction of non-renewable biomass

Referral Link : [https://github.com/hashgraph/guardian/issues/2880](https://github.com/hashgraph/guardian/issues/2880)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-iii.av.-low-greenhouse-gas-emitting-safe-drinking-water-production-systems](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-iii.av.-low-greenhouse-gas-emitting-safe-drinking-water-production-systems)

## ---- March 2024----

### Development of AMS-III.H.: Methane Recovery in Wastewater Treatment

1. Designing of the Schema and getting it approved. Development of the policy using Schema
2. Development of all the tools involved in the policy:
   * Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
   * Tool 04- Emissions from solid waste disposal sites
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 06- Project emissions from flaring
   * Tool 32- Positive lists of technologies

Referral Link: [https://github.com/hashgraph/guardian/issues/2881](https://github.com/hashgraph/guardian/issues/2881)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-iii.h.-methane-recovery-in-wastewater-treatment](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-iii.h.-methane-recovery-in-wastewater-treatment)

## Development of AMS-III.F.: Avoidance of Methane Emissions Through Composting

1. Designing of the Schema and getting it approved.
2. Development of the policy using Schema
3. Development of all the tools involved in the policy
   * Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
   * Tool 04- Emissions from solid waste disposal sites
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 13- Project and leakage emissions from composting

Referral Link: [https://github.com/hashgraph/guardian/issues/2876](https://github.com/hashgraph/guardian/issues/2876)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-iii.f.-avoidance-of-methane-emissions-through-composting](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-iii.f.-avoidance-of-methane-emissions-through-composting)

## Development of ACM0002: Grid-Connected Electricity Generation from Renewable Sources

Development of the policy with all details mentioned in the design schema.\
Tools involved in this policy also needs to be developed. The tools are listed below:

1. Tool 01- Tool for the demonstration and assessment of additionality
2. Tool 02- Combined tool to identify the baseline scenario and demonstrate additionality
3. Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
4. Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
5. Tool 07- Tool to calculate the emission factor for an electricity system
6. Tool 10- Tool to determine the remaining lifetime of equipment
7. Tool 32- Positive lists of technologies

Referral Link: [https://github.com/hashgraph/guardian/issues/2875](https://github.com/hashgraph/guardian/issues/2875)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0002-grid-connected-electricity-generation-from-renewable-sources](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0002-grid-connected-electricity-generation-from-renewable-sources)

### Conforming to Hedera DID, VC, VP, Standards

Update to memo field VP/DID structure to normalize DID spec with the rest of Hedera DID method work (which will also be updated)

Referral Link : [https://github.com/hashgraph/guardian/issues/2211](https://github.com/hashgraph/guardian/issues/2211)

### Development of PWRM0002 Plastic Waste Recycling Methodology, v1.1

Designing of the Schema and getting it approved.&#x20;

Development of the policy using Schema&#x20;

Development of all the tool involved in the policy

Referral Link : [https://github.com/hashgraph/guardian/issues/2920](https://github.com/hashgraph/guardian/issues/2920)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/pwrm0002-plastic-waste-recycling](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/pwrm0002-plastic-waste-recycling)

## ---- April 2024----

### DLT to Address Flawed Methodologies Blog

Draft and published a blog post on the topic of DLT as a solution to address poor data quality and flawed emission and carbon credit methodologies.

Referral Link : [https://github.com/hashgraph/guardian/issues/2906](https://github.com/hashgraph/guardian/issues/2906)

### Live project (data) migration across Policies, across Guardian instances

Implement User Interface (UI) and tooling allowing users to execute multiple cycles of 'export a live project' from a policy and 'import a live project' into another policy. This migration process should work irrespective of the policy versions, standard registries, and Guardian instances, automatically mapping data/documents to the corresponding policy steps in an intelligent way, referring to the Project Developer in situations needing human input via a convenient UI/UX ('User Experience'):

* Project Developer can preview and assess the compatibility of policies and data, and the result of the migration using something analogous to the 'dry-run' mode.
* For cases where the 'new' schemas and policy steps match perfectly the 'old' valid data/documents from the 'source', the 'old' ones should be automatically accepted into the 'target' policy flow with no human intervention.
* Project Developer can review and select/guide the matching and the destination of the 'source' data/documents into the new policy flow with full visibility with regard to:
  * 'source' and 'target' policy structure (side by side), with details of block parameters etc where required.
  * content of the original and destination documents with field-level granularity
* Where data needs to be augmented and thus new signatures are required the corresponding Guardian users (e.g. Standard Registry) get requests to sign the data.

The migration process should be automated, and should result in the 'stopped' project/policy execution on the 'source platform' and 'resumed' from the same point in the policy flow on the 'destination' (other) platform, with full data and tokens visibility and provenance provability in the trust chain. The 'old' data and artifacts produced on the 'source' should be fully useable on the 'target', e.g.

* used in reports
* viewable in the UI
* data referencable and useable in calculations and other policy actions (such as minting)
* operations on 'old' tokens are supported in the new policy smart contracts (retirement, exchanges, etc)

Referral Link: [https://github.com/hashgraph/guardian/issues/3176](https://github.com/hashgraph/guardian/issues/3176)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/live-project-data-migration/live-project-data-migration-ui](https://docs.hedera.com/guardian/guardian/standard-registry/live-project-data-migration/live-project-data-migration-ui)

### FireBlocks Raw Signing Integration

We need to integrate FireBlocks , a Key management tool to manage the Keys and secure Guardian. To get complete info on Fireblocks, please look at [https://www.fireblocks.com/](https://www.fireblocks.com/)

Referral Link : [https://github.com/hashgraph/guardian/issues/1314](https://github.com/hashgraph/guardian/issues/1314)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/fireblocks-raw-signing/fireblocks-signing-in-guardian-ui](https://docs.hedera.com/guardian/guardian/standard-registry/fireblocks-raw-signing/fireblocks-signing-in-guardian-ui)

### Development of ACM0001: Flaring or Use of Landfill Gas

1. Designing of the Schema and getting it approved.
2. Development of the policy using Schema
3. Development of all the tools involved in the policy:
   * Tool 02- Combined tool to identify the baseline scenario and demonstrate additionality
   * Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
   * Tool 04- Emissions from solid waste disposal sites
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 06- Project emissions from flaring
   * Tool 08- Tool to determine the mass flow of a greenhouse gas in a gaseous stream
   * Tool 09- Determining the baseline efficiency of thermal or electric energy generation systems
   * Tool 10- Tool to determine the remaining lifetime of equipment
   * Tool 12- Project and leakage emissions from transportation of freight
   * Tool 32- Positive lists of technologies

Referral Link: [https://github.com/hashgraph/guardian/issues/2874](https://github.com/hashgraph/guardian/issues/2874)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0001-flaring-or-use-of-landfill-gas](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0001-flaring-or-use-of-landfill-gas)

## ---- May 2024----

## Development of Gold Standard's Methodology for Methane Emission Reduction by Adjusted Water Management Practice in Rice Cultivation

Designing of the Schema and getting it approved.&#x20;

Development of the policy using Schema&#x20;

Development of all the tool involved in the policy

Referral Link : [https://github.com/hashgraph/guardian/issues/2921](https://github.com/hashgraph/guardian/issues/2921)

Documentation Link: [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/methane-emission-reduction-by-adjusted-water-management-practice-in-rice-cultivation](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/methane-emission-reduction-by-adjusted-water-management-practice-in-rice-cultivation)

### Full project data comparison as produced/captured by policies

Introduce a comparison functionality where it'd be possible to 'diff' arbitrary sections or the entire trust-chains for different tokens, potentially issued by different policies such that the system would:

* graphically display the differences where a user would then be able to 'scroll' through and review them in the UI
* get a numerical 'similarity score' indicating how similar the two 'chains' are

Referral Link : [https://github.com/hashgraph/guardian/issues/2704](https://github.com/hashgraph/guardian/issues/2704)

Documentation Link: [https://docs.hedera.com/guardian/guardian/standard-registry/project-comparison/project-comparison-using-ui](https://docs.hedera.com/guardian/guardian/standard-registry/project-comparison/project-comparison-using-ui)

### Global environmental/Guardian data search (indexer) component for Hedera and IPFS

* Improve the data storage and indexing capabilities of Guardian for the data belonging to the local instance such that complex analytical queries could be run efficiently, such as 'search for data similar to this' and 'what is the possibility of this being a double entry for something submitted elsewhere'.
* Introduce a global search and indexing capability for data produce by other (all) instances such that queries above could be run on the entire body of Guardian data produced from the beginning of time (in blockchain sense).
* Extend [Block and policy discoverability/search #2281](https://github.com/hashgraph/guardian/issues/2281) for users to be able to preview the usage of the block without having to import "other SR's" policy into their Guardian instance

Referral Link : [https://github.com/hashgraph/guardian/issues/2629](https://github.com/hashgraph/guardian/issues/2629)

Documentation Link: [https://docs.hedera.com/guardian/guardian/global-indexer/indexer-user-guide](https://docs.hedera.com/guardian/guardian/global-indexer/indexer-user-guide)

### Revamp Guardian user/roles and permissions model

* Fundamentally separate the concept of users, roles and permissions in Guardian
* Introduce granular concept of permissions which could be assigned to users, a user could then perform a specific function within the role if its assigned role 'contains' this permission. These should include (but not limited to):
  * Policy edit/submit for review
  * Policy view
  * Policy approval & publish
* Introduce a "user admin" role, which allows:
  * defining new roles from permissions
  * assigning of roles to users
* Create a permissioning system which verifies actor role before any action has been taken throughout Guardian
* Package in suitable most-common role set into Guardian so it can be operated immediately 'out of the box' without the need for additional configuration
* Create a concept of 'delegation' where a user with a particular role/permission can explicitly 'delegate' this role/permission to another user
* Introduce the functionality to produce a report (page, download) which lists all users and their roles/permissions mapping in the system

Referral Link : [https://github.com/hashgraph/guardian/issues/2844](https://github.com/hashgraph/guardian/issues/2844)

Documentation Link: [https://docs.hedera.com/guardian/guardian/standard-registry/roles-and-permissions/roles-and-permissions-user-guide](https://docs.hedera.com/guardian/guardian/standard-registry/roles-and-permissions/roles-and-permissions-user-guide)

## ---- June 2024----

### Development of VMR0006: Energy Efficiency and Fuel Switch Measures in Thermal Applications, v1.2v

Designing of the Schema and getting it approved.&#x20;

Development of the policy using Schema&#x20;

Development of all the tool involved in the policy

Referral Link : [https://github.com/hashgraph/guardian/issues/2922](https://github.com/hashgraph/guardian/issues/2922)

### Hedera interactions resilience module

Create a Guardian 'transaction execution' service which would assure orderly transaction execution and their status tracking, and provide intelligent retry and failure recovery functionality such that required transactions would be guaranteed to be asynchronously executed once, and only once, and in the right order.

Referral Link : [https://github.com/hashgraph/guardian/issues/2905](https://github.com/hashgraph/guardian/issues/2905)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/asynchronous-tasks-status](https://docs.hedera.com/guardian-dev-1/guardian/standard-registry/asynchronous-tasks-status)

### Further evolution of policy comparison (a.k.a 'mass diff')

Relying on the work done in the course of [#1793](https://github.com/hashgraph/guardian/issues/1793) (i.e. creating data structures (hashes) to enable more efficient comparison), allow for mass-comparison of policies such that a user should be able to search for local policies 'similar' to 'different' to some other policy based on some similarity threshold. This is related (but different) to [#2281](https://github.com/hashgraph/guardian/issues/2281) as it focuses on 'easy diff' vs 'easy search'.

Referral Link : [https://github.com/hashgraph/guardian/issues/2706](https://github.com/hashgraph/guardian/issues/2706)

Documentation Link : [https://docs.hedera.com/guardian/guardian/standard-registry/policies/policy-differentiation/global-search-and-comparison-ui](https://docs.hedera.com/guardian-dev-1/guardian/standard-registry/policies/policy-differentiation/global-search-and-comparison-ui)

### Correction of all the Methodologies with new DID Spec

1. We need to implement and correct all the methodologies added with new DID specification.
2. Deploy all the methodologies on testnet and create IPFS timestamps.
3. Test the methodologies with dummy and real data.

Referral Link: [https://github.com/hashgraph/guardian/issues/3296](https://github.com/hashgraph/guardian/issues/3296)

### Development of ACM0018: Electricity Generation from Biomass in Power-Only Plants

1. Designing of the Schema and getting it approved.
2. Development of the policy using Schema
3. Development of all the tools involved in the policy
   * Tool 02- Combined tool to identify the baseline scenario and demonstrate additionality
   * Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
   * Tool 04- Emissions from solid waste disposal sites
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 09- Determining the baseline efficiency of thermal or electric energy generation systems
   * Tool 10- Tool to determine the remaining lifetime of equipment
   * Tool 12- Project and leakage emissions from transportation of freight
   * Tool 16- Project and leakage emissions from biomass

Referral Link :  [https://github.com/hashgraph/guardian/issues/2879](https://github.com/hashgraph/guardian/issues/2879)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0018-electricity-generation-from-biomass-in-power-only-plants](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-acm0018-electricity-generation-from-biomass-in-power-only-plants)

### Development of AMS-I.F.: Renewable Electricity Generation for Captive Use and Mini-Grid

1. Designing of the Schema and getting it approved.
2. Development of the policy using Schema
3. Development of all the tools involved in the policy:
   * Tool 01- Tool for the demonstration and assessment of additionality
   * Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
   * Tool 04- Emissions from solid waste disposal sites
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 06- Project emissions from flaring
   * Tool 12- Project and leakage emissions from transportation of freight
   * Tool 13- Project and leakage emissions from composting
   * Tool 14- Project and leakage emissions from anaerobic digesters
   * Tool 16- Project and leakage emissions from biomass
   * Tool 33- Default values for common parameters

Referral Link: [https://github.com/hashgraph/guardian/issues/2882](https://github.com/hashgraph/guardian/issues/2882)

Documentation Link :  [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-i.f.-renewable-electricity-generation-for-captive-use-and-mini-grid](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-i.f.-renewable-electricity-generation-for-captive-use-and-mini-grid)

### Development of AMS-I.A.

1. Designing of the Schema and getting it approved.
2. Development of the policy using Schema
3. Development of all the tools involved in the policy:
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 16- Project and leakage emissions from biomass
   * Tool 21- Demonstration of additionality of small-scale project activities 
   * Tool 33- Default values for common parameters

Referral Link: [https://github.com/hashgraph/guardian/issues/2884](https://github.com/hashgraph/guardian/issues/2884)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-i.a.-electricity-generation-by-the-user](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-i.a.-electricity-generation-by-the-user)

### Development of AMS-I.C.: Thermal Energy Production with or Without Electricity

1. Designing the Schema for the methodology
2. Development of the policy
3. Development of all the tools involved in this policy
   * Tool 03- Tool to calculate project or leakage CO2 emissions from fossil fuel combustion
   * Tool 05- Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation
   * Tool 06- Project emissions from flaring
   * Tool 07- Tool to calculate the emission factor for an electricity system
   * Tool 09- Determining the baseline efficiency of thermal or electric energy generation systems
   * Tool 12- Project and leakage emissions from transportation of freight
   * Tool 16- Project and leakage emissions from biomas
   * Tool 19- Demonstration of additionality of microscale project activities
   * Tool 21- Demonstration of additionality of small-scale project activities 
   * Tool 22- Leakage in biomass small-scale project activities

Referral Link : [https://github.com/hashgraph/guardian/issues/2873](https://github.com/hashgraph/guardian/issues/2873)

Documentation Link : [https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-i.c.-thermal-energy-production-with-or-without-electricity](https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/cdm-ams-i.c.-thermal-energy-production-with-or-without-electricity)

## ---- July 2024----

### Indexer API

Add suitable API facilities which would allow programmatic access to the indexed data and analytics, which include policy structure data (such as formulas used in the various elements - e.g. Tools) as well as project data.

Referral Link: [https://github.com/hashgraph/guardian/issues/3637](https://github.com/hashgraph/guardian/issues/3637)

### Filtering data for blocks is stateful API, introduce stateless data filters for API usage

I don't necessarily think there is a hard requirement to remove the stateful nature of guardian filtering, as we cannot predict, what are the downstream API consumers are using this functionality or affects, they will be without some kind of deprecation notice.

So, the recommendation would be:

* Add ability to filter using a GET request for a filter, so data can be fetched and filtered in one action
* (As an alternative - preferred) It would be preferable to enable filtering at the block level when retrieving data so a API consumer does not need to add explicit filter blocks in block can use the Guardian API to be more RESTful by default.
* Post a six month deprecation notice for stateful usage of the filter (revert if hard requirement for others)

An example, code enhancement could be implemented like this (tags are easier to reason about):

From old version:

```
  public function filterByTag(string $policyId, string $tag, string $uuid): object
  {
      return (object) $this->httpClient->post("policies/{$policyId}/tag/{$tag}/blocks", [
          'filterValue' => $uuid
      ], true);
  }
```

to:

```
public function filterByTag(string $policyId, string $tag, string $uuid): object
{
    return (object) $this->httpClient->get("policies/{$policyId}/tag/{$tag}/blocks?filterValue={$uuid}");
}
```

Or provide/document clearly a mechanism to filter on an [interface document block](https://docs.hedera.com/guardian/guardian/standard-registry/policies/policy-creation/introduction/interfacedocumentssourceblock) itself, which would be **preferred**.

Referral Link: [https://github.com/hashgraph/guardian/issues/3610](https://github.com/hashgraph/guardian/issues/3610)

### Development of AMS-I.E: Switch from Non-Renewable Biomass for Thermal Applications by the User – v.13.0

Designing of the Schema and getting it approved.&#x20;

Development of the policy using Schema&#x20;

Development of all the tool involved in the policy

Referral Link : [https://github.com/hashgraph/guardian/issues/2923](https://github.com/hashgraph/guardian/issues/2923)

### Auto-testing community submitted policies

* Relying on the [Policy equivalence assessment based on their execution results for the same data #1886](https://github.com/hashgraph/guardian/issues/1886) and [Full project data comparison as produced/captured by policies #2704](https://github.com/hashgraph/guardian/issues/2704) introduce capability to automatically and repeatably test policies
* Introduce a hook into the new policy merge and release build events which triggers execution of the community policies regression test cycle

Referral Link : [https://github.com/hashgraph/guardian/issues/2847](https://github.com/hashgraph/guardian/issues/2847)

### Development of GS Methodology for Emission Reductions from Safe Drinking Water Supply v.1.0

Designing of the Schema and getting it approved.&#x20;

Development of the policy using Schema&#x20;

Development of all the tool involved in the policy

Referral Link : [https://github.com/hashgraph/guardian/issues/2924](https://github.com/hashgraph/guardian/issues/2924)

### GHG scorecards Research

* Identify the KPIs (and the data requirements behind them) to be captured by the Environmental scorecards to best support demand signaling.
* Identify the business requirements for the Environmental Scorecards, i.e., how they could be used by supply and demand-side actors, markets, etc.?

Referral Link : [https://github.com/hashgraph/guardian/issues/1017](https://github.com/hashgraph/guardian/issues/1017)
