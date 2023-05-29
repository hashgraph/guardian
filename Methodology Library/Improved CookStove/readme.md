## Guardian Policy for Improved Cookstoves

**Introduction**

Currently, there are many different types of cookstoves and several Standards Bodies, each with their own Standard that must be followed in order to prove the quality of a given GHG emission reduction claim. This process is time and labor intensive, creating barriers to those willing to enter the market. Digitization of this manual, paper driven process is a necessary step to scaling at the speed required for climate change.

The Value of Digitizing the Methodology:

1. Creates trust via
- Traceability and transparency of data
- Digital quality assurance
- Immutability of data
- Transparency of Verifier credentials and approval data

2. Reduces barriers to entry
- Accessible and standardized policies and processes inform and encourage suppliers to bring their projects to market
- Decentralized project management reduces dependency on Standards Bodies and reduces time to market.

3. Contributes to Climate Goals
- Achieves higher confidence carbon project outcomes, and scales the finance and rollout of carbon projects at the speed required by the climate emergency

This first of its kind Hedera Guardian Improved Cookstove Policy (ICP) was designed per the [Anthropogenic Impact Accounting Ontology](https://wiki.hyperledger.org/display/CASIG/An+ontology+for+anthropogenic+impact+accounting). To this end, the Guardian Policy does not adhere to a specific Standard or approved methodology for carbon offset quantification, rather it abstracts concepts from the most commonly used standards and methodologies, categorizes them, models their relationships, and then instantiates them in the form of this digitally native Guardian Policy and its associated Guardian Schema. This policy issues a non-fungible Improved Cookstove Carbon Credit (ICCC) Token.

**Scope and Applicability**

Scope: Quantification of greenhouse gas (GHG) emission reductions from improved biomass cookstoves developed by the Nova Institute and Tolam Earth, Inc.

Applicability: Applicable to activities reducing GHG emissions from cookstoves through switching to more energy efficient stoves.

Token: Non-Fungible

Type: Carbon Offset

Standard: Multiple

Methodology: Multiple

Required Documents: Project Design Document (PDD), PDD Validation Report, Monitoring Report, Monitoring Report Verification, Double Counting Certification, VVB Certification and Conflict of Interest Statement. See 'Preconditions' below for more detail.

NFT Owner: The agent fulfilling the 'Project Developer' role.

**Preconditions**

1. Standard Registry account on a Guardian instance to import the policy and its subpolicies. See [Guardian documentation](https://docs.hedera.com/guardian/policy-creation-using-the-guardian-apis/prerequesite-steps) for steps to create an account and import a policy.
2. User accounts within the Guardian to fill the roles defined in the policy and its subpolicies.
3. Required Project Documentation posted to traceable, immutable source which can be accessed by the Tolam Earth Marketplace.
4. To fulfil the Project Developer role (see 'Roles' below for details), an agent must obtain an HGICP Project Developer License (HGICP-L-PD) from the ICP Agent Application Subpolicy.
5. To fulfil the PDD Validator role, an agent must obtain an HGICP PDD Validator License (HGICP-L-PV) from the ICP Agent Application Subpolicy.
6. To fulfil the MR Verifier role, an agent must obtain an HGICP MR Verifier License (HGICP-L-MV) form the ICP Agent Application Subpolicy.
7. In addition to an HGICP-L-PD, a Project Developer will need to obtain an HGICP PDD Validation Certificate (HGICP-VCERT-PDD, issued by the ICP PDD Validation Subpolicy) to complete the project registration step of the main policy. To apply for an ICCC issuance, a Project Developer will furthermore need to obtain an HGICP MR Verification Certificate (HGICP-VCERT-MR, issued by the ICP MR Verification Subpolicy).

Testnet message IDs:
- Improved Cookstove Policy (main): 1676641566.153212434
- Improved Cookstove Policy - Agent Application Subpolicy: 1676640723.598879583
- Improved Cookstove Policy - PDD Validation Subpolicy: 1676641042.365033796
- Improved Cookstove Policy - MR Verification Subpolicy: 1676641311.452316505

**Policy User Roles**

Improved Cookstove Policy (main):
1. Project Developer (PROJECT_DEVELOPER): Person responsible for executing the Project Design and collecting Data as per the Project Application. The Project Developer submits Monitoring Reports and is the beneficiary of the Credit Claims.
2. Public Viewer (VIEWER): Any member of the public who wishes to view the Guardian TrustChain for a specific ICCC issuance.
3. Standard Body (OWNER): Administrative role that approves Verifiers, approves Project Applications, and manages the issuance of claims.

Improved Cookstove Policy - Agent Application Subpolicy:
1. (Anyone): Any person or legal entity who wishes to fulfil one or more of the following ICP roles:
- Project Developer (in any of the four policies)
- PDD Validator (in the PDD Validation Subpolicy)
- MR Verifier (in the MR Verification Subpolicy)
2. Standard Body (OWNER): See Improved Cookstove Policy (main).

Improved Cookstove Policy - PDD Validation Subpolicy:
1. Project Developer (PROJECT_DEVELOPER): See Improved Cookstove Policy (main).
2. Validator (VALIDATOR): An agent who validates Project Designs by reviewing Project Design Documents.
3. Public Viewer: Not yet implemented.

Improved Cookstove Policy - MR Verification Subpolicy:
1. Project Developer (PROJECT_DEVELOPER): See Improved Cookstove Policy (main).
2. Verifier (VERIFIER): Approved, independent person or organization that verifies Claims Data in the form of Monitoring Reports.
3. Public Viewer: Not yet implemented.

**Schema**

Improved Cookstove Policy (main):
- Presentation Request: Role License (PR-RL)
- Project Listing Application (PLA)
- Document Review: Project Listing Application (DR-PLA)
- Project Registration Request (PRR)
- HGICV Token Issuance Request (TIR)

ICP Agent Application Subpolicy:
- Role Application (RA)
- Agent Details (AD)

ICP PDD Validation Subpolicy:
- Presentation Request: Role License (PR-RL)
- PDD Section A - Description of Project (PDD-XA)
- Document Review: PDD Section A (DR-PDD-XA)
- PDD Section B - Methodologies (PDD-XB)
- Document Review: PDD Section B (DR-PDD-XB)
- PDD Section C - Crediting Period (PDD-XC)
- Document Review: PDD Section C (DR-PDD-XC)
- PDD Section D - Other Impacts (PDD-XD)
- Document Review: PDD Section D (DR-PDD-XD)
- PDD Section E - Stakeholder Engagement (PDD-XE)
- Document Review: PDD Section E (DR-PDD-XE)
- Project Design Document (PDD)
- Location
- GeoCoordinate
- GeoLine
- GeoPolygon
- Technology or Measure
- Project Party
- Table: Project Boundary
- Table Row: Project Boundary
- Emission Reduction Calculation
- Table Row: Data/Parameter Monitoring
- Table Row: Ex Ante Emissions Estimations
- Monitoring Plan

ICP MR Verification Subpolicy:
- Presentation Request: Role License (PR-RL)
- Monitoring Report (MR)
- Table Row: Data/Parameter Monitoring
- Document Review: Monitoring Report (DR-MR)

**Workflow**

![Table showing the workflows of the Improved Cookstove Policy and its subpolicies](https://bafybeib4ms5lkfbcccbpc6tlcs3cilsiqmgszld7mlndllg653ywjhvzyu.ipfs.w3s.link/PolicyWorkflow.png)

**Glossary**

Claim: The end result of execution of a project, often expressed per unit time, which quantifies the impact of the initiative.

Guardian: The Guardian is a modular open-source solution that includes best-in-class identity management and Decentralized Ledger Technology (DLT) libraries. At the heart of the Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a requirements-based tokenization implementation.

Guardian Policy: Defines activities, rules, and interactions between activities on and across all levels of the activity hierarchy, that are performed in order to achieve the outcome of an auditable, transparent claim of climate impact.

Guardian Schema: Describes the structure and definition of data fields required within an activity, sub-activity, or sub-sub-activity. Essentially, the schema defines the data fields that must be supplied for each activity and the characteristics of those fields.

Methodology: As part of a Standard, Methodologies define the rules for calculating emissions increase, footprint, reductions and/or removals.

Monitoring Report: Document that describes and justifies any changes to the Project Design Document, based upon what happened during execution of a project. Also includes any data and/or calculations made during the time period covered by the document. A single project can have multiple Monitoring Reports associated with it, and each Monitoring Report is associated with a Claim.

Project Design Document: Documentation of plans for an activity to be executed following the prescriptions of the Standard in a concrete context for generation of assets.

Project Documentation: Any documentation required by the Guardian Schema. This may include Monitoring Reports, Project Design Documents, Verifier Credentials, etc.

Project Listing Application: Process during which a Project Developer expresses their intent to develop a (cookstove) project towards a specific Registry, and the Registry then acknowledges that intent by assigning a project code to the project and listing it in the Registry’s public database of projects.

Project Registration: When Project Design Documents are approved by a Registry.

Standard: Set of project design, monitoring, and reporting criteria against which activities’ impacts can be certified or verified, e.g. Greenhouse Gas (GHG) emission reductions, or social benefits.

Standards Body: Organization which defines the standard and approves project design, monitoring, and reporting criteria within it.
