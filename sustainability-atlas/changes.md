Hedera Guardian — Sustainability Atlas GitHub Issues
Issue 1: Build a Business Abstraction Layer for Blockchain Data
Labels: enhancement, indexer, data-model, high-priority Action Items Covered: #1, #2, #3, #4, #5 Stakeholders: Nature Wired, Allcot, WinCL, Evercity, Earthood, Verra, ChangeCode, DOVU, CAD Trust Complexity: Very High
Problem description
The Sustainability Atlas (Indexer) currently presents raw blockchain data — transaction hashes, token IDs, and Hedera-native events — which are meaningless to business users in the carbon credit market. Non-technical stakeholders such as buyers, auditors, sustainability managers, and registry operators cannot understand what happened on-chain without deep blockchain knowledge. There is no standardized business entity model that translates blockchain events into real-world concepts, and different carbon registries (Verra, Gold Standard, ACR, etc.) use inconsistent terminology for the same concepts, making cross-registry comparison impossible.
Requirements
Define standardized business entities — Create a canonical data model with the following entities: Project, Credit Issuance, Transfer, Retirement, Organization, Vintage, Standard, and Methodology. Each entity must have human-readable attributes (e.g., a Credit Issuance shows project name, organization, quantity, vintage, standard, and status).
Create mapping logic from blockchain events to business concepts — Translate raw on-chain events to business terminology: Mint → Credit Issuance, Transfer → Ownership Change, Burn → Credit Retirement. Users must see the real-world meaning of blockchain events without needing to interpret raw data.
Build a standardized data schema that harmonizes data across registries — Unify terminology across registries with a registry term mapping table (e.g., Verra's "Issuance Volume", Gold Standard's "Credits Issued", ACR's "Offset Quantity" all map to "Credit Quantity"). Retain original registry values for traceability alongside the standardized terms.
Design a business-friendly transaction model — Every activity must display: Project name, Organization, Quantity, Date, Status, and Registry source in a clear tabular format, enabling users to quickly review carbon credit activities and transactions.
Build a lifecycle relationship engine — Connect the full project lifecycle: Project → Issuance → Transfer → Retirement. Users must be able to trace the full lifecycle of credits from creation through transfers to retirement (e.g., Project "Kenya Cookstove Program" → 1,000 Credits Issued → Transferred to Climate Fund (500) and Microsoft (500) → Microsoft Retired 200).
Definition of done
A complete business entity data model exists with all specified entity types and their attributes.
Blockchain events are automatically translated into business concepts visible to end users.
Data from multiple registries is harmonized into the standardized schema while preserving original values.
Users can view any transaction in business-friendly tabular format showing all required fields.
The lifecycle engine connects all related events for a given project, allowing end-to-end traceability.
Acceptance criteria
[ ] Standardized business entities (Project, Credit Issuance, Transfer, Retirement, Organization, Vintage, Standard, Methodology) are defined and stored with human-readable attributes.
[ ] On-chain Mint events display as "Credit Issuance", Transfer events as "Ownership Change", and Burn events as "Credit Retirement" in all UI views.
[ ] A registry term mapping table exists and maps at least Verra, Gold Standard, and ACR terminology to the canonical schema.
[ ] Original registry field values are preserved and accessible alongside standardized values.
[ ] Every transaction displays: project name, organization, quantity, date, status, and registry source.
[ ] Navigating from a Project shows all linked Issuances → Transfers → Retirements in a lifecycle view.
[ ] The data model supports adding new registries and entity types without structural changes.

Issue 2: Implement Dual Interface Architecture (Business View & Technical View)
Labels: enhancement, indexer, ui, medium-priority Action Items Covered: #6, #7, #8 Stakeholders: WinCL, Evercity, Envision Complexity: Medium
Problem description
The Sustainability Atlas currently presents data in a single format that tries to serve both business users and technical developers. Business users are overwhelmed by technical details (hashes, node data, raw events), while developers lack easy access to the granular technical information they need. There is no way to switch between a simplified business perspective and a detailed technical perspective.
Requirements
Define two interface layers — Establish a Business View and a Technical View as distinct presentation modes within the Indexer.
Business View — Provide simplified terminology, dashboards, lifecycle views, and grid-based data displays with filters. This view should hide blockchain-specific details and present only business-relevant information.
Technical View — Provide access to transaction hashes, Hedera event data, node information, API payloads, raw message timestamps, and other developer-oriented data.
Add toggle mechanism — Implement a "Switch to Technical View" / "Switch to Business View" toggle that allows users to switch between the two interfaces seamlessly without losing their navigation context.
Definition of done
Two distinct interface layers exist: Business View and Technical View.
A toggle mechanism allows switching between views without losing the current navigation state.
Business View shows only business-friendly data; Technical View shows raw blockchain/API data.
Acceptance criteria
[ ] A visible toggle control ("Switch to Technical View" / "Switch to Business View") is present in the UI.
[ ] Business View displays: simplified terminology, dashboards, lifecycle views, and sortable/filterable grids.
[ ] Technical View displays: transaction hashes, Hedera event details, node data, and API-level information.
[ ] Switching views preserves the user's current page/context (e.g., viewing Project X in Business View and toggling to Technical View shows the same project's technical details).
[ ] Default view for new users is the Business View.

Issue 3: Build Advanced Search and Filtering Engine
Labels: enhancement, indexer, search, high-priority Action Items Covered: #9, #10, #11, #12, #13 Stakeholders: Nature Wired, WinCL, Evercity, Envision, DOVU, NoviqTech Complexity: Very High
Problem description
The Sustainability Atlas currently lacks robust search and filtering capabilities that allow business users to find relevant projects and credits efficiently. Users cannot search across business attributes (project name, organization, vintage, methodology, sector, geography, status, SDGs), apply advanced filter conditions, chain filters progressively, share filtered views, or use predefined search templates. This forces users to manually sift through large datasets, severely limiting the platform's usability for procurement, analysis, and compliance workflows.
Requirements
Implement business-based filters — Enable search/filter by: project name, organization, vintage, geography, sector, methodology, status, and SDGs. Search results should show summary statistics (e.g., "3 Projects Found, Total Credits Issued: 75,000").
Implement advanced operators — Support filter operators: Equals, Multiple select (IN), Range (volume), Greater/Less than, and Date range.
Enable progressive filtering — Allow filtering within results (chained searches). Users start with a broad filter (e.g., Sector = Forestry), then refine further (e.g., Country = Brazil, Vintage = 2022) without resetting.
Implement URL-based filter state — Generate shareable URLs that encode the current filter state (e.g., platform.com/projects?country=kenya&methodology=cookstove), allowing users to share filtered views with colleagues.
Build preset search templates — Provide predefined, one-click search templates such as "Credits Retired This Year", "Projects by Sector", and "Pipeline Issuances 2026" to help new users get value quickly and reduce the learning curve.
Definition of done
Users can search and filter using all specified business attributes with advanced operators.
Progressive (chained) filtering is fully functional.
All filter states are reflected in the URL and can be shared/bookmarked.
Preset search templates are available and functional.
Acceptance criteria
[ ] Filters are available for: project name, organization, vintage, geography, sector, methodology, status, and SDGs.
[ ] Advanced operators (equals, in-list, range, greater/less than, date range) work correctly for all applicable fields.
[ ] Applying a filter to an already-filtered result set narrows the results progressively (no reset).
[ ] The browser URL updates in real time to reflect the current filter state.
[ ] Pasting a filter-encoded URL into a new browser session restores the exact filtered view.
[ ] At least 3 preset search templates are available and return correct results when clicked.
[ ] Search results display summary statistics (count of matching projects, total credits, etc.).
[ ] Search performance is acceptable for datasets of 10,000+ projects (results within 3 seconds).

Issue 4: Implement Grid, Comparison, and Market Intelligence Views
Labels: enhancement, indexer, ui, market-intelligence Action Items Covered: #14, #15, #16, #17 Stakeholders: Nature Wired, Allcot, WinCL, Evercity, Earthood, ChangeCode, DOVU Complexity: High
Problem description
The Sustainability Atlas does not provide sortable, comparable grid views that allow users to efficiently analyze and compare carbon credit projects. Users cannot sort project data by volume, vintage, geography, or other attributes; cannot compare projects side by side; and have no aggregated summary views by sector, geography, vintage, methodology, or SDG. This makes it difficult for procurement specialists, buyers, and analysts to evaluate and compare credit options before making decisions.
Requirements
Build sortable grid-based views — Display project and credit data in grid format, sortable by: volume, vintage, geography, standard, methodology, and status.
Enable multi-column sorting — Allow sorting by multiple columns simultaneously (e.g., primary sort by vintage, secondary sort by volume).
Enable side-by-side comparison mode — Allow users to select 2+ projects and compare them in a structured side-by-side view showing key attributes (credits issued, country, standard, methodology, etc.).
Create summary aggregation engine — Provide aggregated summary views grouped by: sector, geography, vintage, methodology, and SDG (e.g., "Credits Issued by Sector: Forestry 40%, Energy 35%, Waste 25%").
Definition of done
Sortable grids are functional with single and multi-column sorting.
Side-by-side comparison view works for 2 or more selected projects.
Aggregation summaries are available for all specified grouping dimensions.
Acceptance criteria
[ ] Grid views display project/credit data with sortable columns for volume, vintage, geography, standard, methodology, and status.
[ ] Multi-column sorting is supported (e.g., sort by vintage ascending, then volume descending).
[ ] Users can select 2+ projects and open a comparison view showing attributes side by side.
[ ] Aggregation summaries are available grouped by sector, geography, vintage, methodology, and SDG.
[ ] Aggregation views show both absolute values and percentage breakdowns.
[ ] Grid pagination handles large datasets without performance degradation.

Issue 5: Build Dashboards and Market Indicator Views
Labels: enhancement, indexer, dashboard, high-priority Action Items Covered: #18, #19, #20 Stakeholders: Nature Wired, Allcot, WinCL, Evercity Complexity: High
Problem description
The Sustainability Atlas lacks pre-built dashboards that present key market indicators at a glance. Users (regulators, sustainability managers, market analysts) have no way to quickly view aggregate metrics like total credits issued, total retired, active project counts, or regional distributions. There are no charting capabilities for trend analysis and no year-over-year change indicators, making it impossible to assess market dynamics without manually compiling data.
Requirements
Dashboard framework — Build a dashboard layer displaying key metrics: Total Credits Issued, Total Credits Retired, Active Projects, and Top Regions.
Charts and visualizations — Implement interactive charts for: issuance trends (over time), retirement trends (over time), vintage distribution, and geographic heatmap.
Trend indicators — Display year-over-year (YoY) change percentages and growth/decline markers alongside key metrics so users can immediately identify market direction.
Definition of done
A dashboard view exists with all specified KPI metrics displayed prominently.
Interactive charts are functional for all four visualization types.
YoY trend indicators are displayed alongside metrics.
Acceptance criteria
[ ] Dashboard displays: Total Credits Issued, Total Credits Retired, Active Projects count, and Top Regions.
[ ] An interactive line/bar chart shows issuance trends over time with configurable date range.
[ ] An interactive line/bar chart shows retirement trends over time.
[ ] A chart shows vintage distribution (credits grouped by vintage year).
[ ] A geographic heatmap visualizes credit distribution by region/country.
[ ] Each KPI metric shows YoY change as a percentage with a growth (↑) or decline (↓) indicator.
[ ] Dashboard loads within 5 seconds for the full dataset.

Issue 6: Implement SDG Framework Standardization
Labels: enhancement, indexer, sdg, high-priority Action Items Covered: #21, #22, #23 Stakeholders: Nature Wired Complexity: High
Problem description
The Sustainability Atlas does not provide a structured framework for mapping projects and credits to the UN Sustainable Development Goals (SDGs). There is no consistent SDG mapping model, no ability to filter projects by SDG, and no SDG-focused dashboards. ESG analysts and sustainability managers cannot assess the SDG alignment of carbon credit projects or generate SDG-based impact reports, which is a fundamental requirement for modern sustainability reporting.
Requirements
Create SDG mapping model — Map every project to relevant SDG goals, and link SDG goals to their specific targets. Provide methodology-level pre-mapping (i.e., certain methodologies automatically suggest applicable SDGs). Support the mapping structure: Project → SDG Goals → SDG Targets.
Enable SDG filters (multi-select) — Allow users to select one or more SDGs and filter projects/credits accordingly. Combine SDG filters with geographic filters for targeted discovery (e.g., SDG 13 + SDG 15 + East Africa).
Create SDG aggregated dashboards — Build dedicated dashboard views showing aggregated metrics by SDG: number of projects per SDG, credits issued per SDG, regional distribution by SDG, and trend analysis.
Definition of done
A data model maps projects to SDG goals and targets, with methodology-level pre-mapping.
SDG multi-select filtering works across all search and grid views.
SDG-focused dashboard displays aggregated metrics.
Acceptance criteria
[ ] Every project has at least one SDG mapping (goal + target level).
[ ] Methodologies have pre-configured SDG associations that automatically apply to new projects using that methodology.
[ ] Users can filter by one or more SDGs simultaneously using multi-select controls.
[ ] SDG filters combine with other filters (geography, vintage, sector, etc.).
[ ] An SDG dashboard shows: project count per SDG, credits per SDG, and geographic distribution per SDG.
[ ] SDG dashboard data is exportable for reporting purposes.

Issue 7: Build ESG and Compliance Reporting Engine
Labels: enhancement, indexer, reporting, esg Action Items Covered: #24, #25, #26, #27 Stakeholders: WinCL, ChangeCode Complexity: Medium
Problem description
The Sustainability Atlas currently does not support exporting data in structured formats suitable for ESG and compliance reporting. Sustainability officers and reporting teams cannot easily extract datasets, impact summaries, or project documentation in commonly required formats (CSV, Excel, PDF).Additionally, exported reports lack data traceability and verification references. 
Users cannot independently verify the authenticity of externally sourced data because reports do not include source references such as transaction IDs, registry links, or verification URLs.For data originating from external systems (outside Guardian), verification depends on the mechanisms provided by those systems. If such mechanisms are unavailable, only pre-approved data sources that support automated verification should be eligible for import into the Sustainability Atlas.The platform also lacks embedded guidance on disclosure standards, calculation methodologies, and assurance expectations, leaving users to determine reporting requirements independently.
Requirements
Build export engine - Allow users to export structured data in CSV, Excel (.xlsx), and PDF formats for reporting and sharing purposes.
Structured export fields - Exports shall include standardized ESG reporting fields such as emissions reduced, reporting year, mitigation type, standard, and vintage to ensure consistency and comparability.
Data Traceability and Verification References
Exports shall include traceability references such as transaction IDs, registry record IDs, verification URLs, and source system identifiers to support independent verification.
Where available, direct verification links (e.g., blockchain explorers like Hashscan) shall be provided. For distributed ledger records, the system shall support future Block Item Proofs for independent validation.
If verification mechanisms are unavailable, data imports shall be restricted to pre-approved sources that support automated verification.
Impact summary generator - Provide an automated impact summary generator that compiles key metrics (total credits, retirements, SDG contributions, geographic distribution) into a ready to use summary document.
Add disclosure guidance - Provide embedded reporting guidance including term definitions, calculation explanations, framework alignment notes, and verification guidance.
Definition of done
Data exports available in CSV, Excel, and PDF formats
Exported reports include structured ESG fields
Exported reports include verifiable source references
Impact summary can be generated with one click
Disclosure guidance is embedded across the platform
Only verifiable external data sources are supported for imports
Acceptance criteria
[ ] Users can export any filtered dataset to CSV, Excel (.xlsx), and PDF formats.
[ ] Exports include structured fields: emissions reduced, reporting year, mitigation type, standard, and vintage.
[ ] Exports include source references (transaction IDs, registry IDs, verification URLs.
[ ] Verification links redirect users to source systems for independent validation
[ ] Unsupported external data sources without verification mechanisms cannot be imported
[ ] “Export Impact Summary” generates a compiled summary document with key metrics
[ ] Tooltip definitions appear for all key terms and metrics
[ ] Calculation explanations are available for derived metrics
[ ] Disclosure framework and assurance guidance is accessible within the platform
Exported files open correctly in standard applications (Excel, PDF readers)



Issue 8: Build MRV Data Ingestion and Analysis Capabilities
Labels: enhancement, indexer, mrv, data-pipeline Action Items Covered: #28, #29, #30 Stakeholders: WinCL, NoviqTech Complexity: Medium
Problem description
Monitoring, Reporting, and Verification (MRV) data is critical for validating the integrity of carbon credits, but the Sustainability Atlas currently has no capability to ingest, display, or analyze MRV datasets. Auditors, verifiers, and project operators cannot view raw sensor data, explore time-series measurements, drill down to individual device performance, or trace the lineage from MRV data through calculation logic to the resulting credit issuance. This lack of transparency undermines trust in the credit verification process.
Discussion Point
Requirements
Build MRV ingestion pipeline — Support ingestion of large tabular and time-series MRV datasets, linked to their corresponding Guardian policies and projects.
Create MRV data exploration tools — Provide a table viewer with filters, sorting, pagination, time-range filters, and drill-down to individual device/sensor level records.
Build data lineage engine — Trace the path from raw MRV data → calculation/policy logic → credit issuance result, allowing users to verify that the correct data drove the correct issuance outcomes.
Definition of done
MRV datasets can be ingested and linked to policies/projects.
A table viewer allows exploration of MRV data with filtering, sorting, and device-level drill-down.
Data lineage from MRV input to credit issuance output is navigable.
Acceptance criteria
[ ] MRV datasets (tabular and time-series) can be ingested and stored, linked to the originating policy and project.
[ ] A table viewer displays MRV records with column sorting, filtering, and pagination.
[ ] Time-range filters allow viewing MRV data within specific date ranges.
[ ] Users can drill down to individual device/sensor ID and view its historical records.
[ ] A lineage view traces: MRV data → calculation logic applied → resulting credit issuance, with clickable navigation between each stage.
[ ] MRV data loads performantly for datasets with 100,000+ records.

Issue 9: Implement Pipeline and Forward Supply View
Labels: enhancement, indexer, supply-planning, medium-priority Action Items Covered: #31, #32, #33, #34 Stakeholders: WinCL Complexity: Medium
Problem description
The Sustainability Atlas has no visibility into the pipeline of future credit supply. Buyers, market analysts, and procurement teams cannot see which projects are in the pipeline, what milestones they have reached (registration, MRV submission, verification), when credits are expected to be issued, or what projected volumes look like. This makes forward planning and procurement strategy impossible within the platform.
Requirements
Display pipeline projects — Show projects that are in pre-issuance stages, clearly distinguished from already-issued projects.
Show milestone tracking — For each pipeline project, display progress through key milestones: Registration → MRV Submission → Verification → Issuance, with dates (actual or expected).
Filter by expected issuance year — Allow users to filter pipeline projects by their projected issuance year to plan procurement timing.
Show projected volumes — Display estimated/projected credit volumes for pipeline projects based on available project data and methodology.
Definition of done
Pipeline projects are visible in the Indexer with milestone tracking.
Filtering by expected issuance year is functional.
Projected volumes are displayed for pipeline projects.
Acceptance criteria
[ ] A dedicated "Pipeline" view or filter shows projects in pre-issuance stages.
[ ] Each pipeline project displays milestone progress: Registration, MRV Submission, Verification, and Issuance Forecast with dates.
[ ] Users can filter pipeline projects by expected issuance year.
[ ] Projected credit volumes are displayed per pipeline project.
[ ] Pipeline projects are visually distinguished from already-issued projects (e.g., status badge or color coding).
[ ] The pipeline view supports sorting by expected issuance date and projected volume.

Issue 10: Implement User Identity and Personalization Features
Labels: enhancement, indexer, user-experience, personalization Action Items Covered: #35, #36, #37, #38, #39, #40, #41 Stakeholders: Nature Wired, WinCL, Envision Complexity: Medium
Problem description
The Sustainability Atlas currently operates as a generic public view with no user authentication, personalization, or role-based experience. All users see the same interface regardless of their role (buyer, auditor, registry operator, sustainability lead). Users cannot save searches, follow projects, receive notifications about changes, or build portfolios of tracked credits. This means every session starts from scratch, and users cannot tailor the platform to their specific workflows.
Requirements
Secure authentication — Implement user login and session management integrated with Guardian's identity mechanisms.
Role definitions — Define and support roles: Buyer, Auditor, Registry Operator, and Sustainability Lead, with role-appropriate default views and dashboards.
Personalized dashboards — Allow users to create, save, and customize their personal dashboards showing the metrics and data most relevant to them.
Save searches — Allow users to save search/filter configurations for reuse across sessions.
Follow/Watch functionality — Enable users to follow/watch specific projects, organizations, or credits and receive updates when data changes.
Notifications — Send notifications for: new issuance events, retirements, and status changes on followed items.
Portfolio builder — Allow users to group projects and credits into custom portfolios with aggregated metrics (total credits, value, SDG coverage, etc.).
Definition of done
User authentication is functional with Guardian integration.
Role-based default views are configured for all defined roles.
Users can save searches, follow items, receive notifications, build custom dashboards, and manage portfolios.
Acceptance criteria
[ ] Users can register/login securely with sessions managed via Guardian identity integration.
[ ] Roles (Buyer, Auditor, Registry Operator, Sustainability Lead) are assignable and determine default dashboard/views.
[ ] Users can create and save personalized dashboard configurations that persist across sessions.
[ ] Saved searches are accessible from the user's profile and can be re-executed with one click.
[ ] Users can follow/watch projects, organizations, or credits with a visible "Follow" action.
[ ] Notifications are triggered for new issuances, retirements, and status changes on followed items.
[ ] Users can create portfolios by grouping selected projects/credits and view aggregated metrics for each portfolio.
[ ] All personalization data persists across sessions and devices (when logged in).

Issue 11: Introduce a Methodology Explorer
Labels: enhancement, indexer, methodology, transparency Action Items Covered: #42 Stakeholders: Nature Wired, WinCL, Evercity Complexity: Medium
Problem description
The Sustainability Atlas does not provide a dedicated section for exploring carbon credit methodologies. Users have no centralized place to view methodology details, compare versions, or discover which projects use a given methodology. This limits transparency and makes it difficult for buyers, auditors, and analysts to understand the technical basis behind carbon credit issuance.
Requirements
Create a dedicated Methodology Explorer section within the Indexer.
Display methodology details: name, description, registry/standard owner, applicable sectors, and emission reduction approach.
Show methodology versions with change history.
Link each methodology to its related projects, enabling navigation from methodology to all projects that use it.
Definition of done
A Methodology Explorer section exists in the Indexer with searchable, browsable methodology entries.
Each methodology entry shows its details, version history, and linked projects.
Acceptance criteria
[ ] A "Methodology Explorer" section is accessible from the main navigation.
[ ] Each methodology displays: name, description, owning registry/standard, applicable sectors, and emission reduction approach.
[ ] Methodology version history is visible, showing changes between versions.
[ ] Clicking on a methodology lists all related projects.
[ ] Methodologies are searchable by name, sector, and standard.

Issue 12: Provide Access to Guardian Policies from the Indexer
Labels: enhancement, indexer, governance, transparency Action Items Covered: #43 Stakeholders: Nature Wired, WinCL, Evercity Complexity: Medium
Problem description
Users of the Sustainability Atlas cannot view the Guardian policies that govern each methodology or project. The policies define the rules, workflows, and validation logic behind credit issuance, but this governance layer is invisible to Indexer users. This lack of transparency prevents stakeholders from understanding and verifying the rules under which credits were created.
Requirements
Enable users to view the Guardian policy associated with each methodology or project directly from the Indexer.
Display policy metadata: policy name, version, status, owner (Standard Registry), and description.
Provide a link or navigation path to the full policy definition (either rendered in the Indexer or deep-linked to the Guardian policy view).
Definition of done
Each project and methodology in the Indexer shows its associated Guardian policy.
Users can navigate to or view the policy details from the project/methodology page.
Acceptance criteria
[ ] Each project page displays its associated Guardian policy name and version.
[ ] Each methodology page displays its associated Guardian policy name and version.
[ ] Clicking the policy reference navigates to a detailed policy view or Guardian deep link.
[ ] Policy metadata (name, version, status, owner, description) is visible.
[ ] The policy view is accessible to all authenticated users (read-only).

Issue 13: Display Hedera Policy References in the Indexer
Labels: enhancement, indexer, hedera, compliance Action Items Covered: #44 Stakeholders: Nature Wired, WinCL, Evercity Complexity: Low–Medium
Problem description
Users of the Sustainability Atlas cannot view the Hedera on-chain policy references associated with each methodology or project. These Hedera policies represent the on-chain compliance framework behind credit issuance, and without visibility into them, users cannot fully verify the provenance and governance integrity of credits at the blockchain level.
Requirements
Allow users to view Hedera policy references (Hedera topic IDs, message timestamps, and on-chain policy anchors) associated with each methodology or project.
Display the relevant Hedera network references in the Technical View (and a simplified version in the Business View).
Provide links to verify the policy on Hedera explorers (e.g., HashScan) where applicable.
Definition of done
Hedera policy references are displayed for each project and methodology.
Users can verify the on-chain policy via external Hedera explorers.
Acceptance criteria
[ ] Each project page shows the associated Hedera policy topic ID and relevant message timestamps.
[ ] Each methodology page shows the associated Hedera policy reference.
[ ] A link to an external Hedera explorer (e.g., HashScan) is provided for on-chain verification.
[ ] In Business View, Hedera references are shown in simplified form (e.g., "Verified on Hedera — View Proof").
[ ] In Technical View, full Hedera topic IDs, message timestamps, and transaction details are displayed.

Issue 14: Create Methodology-Specific Dashboards (Priority Methodologies First)
Labels: enhancement, indexer, dashboard, methodology Action Items Covered: #45 Stakeholders: Nature Wired, WinCL, Evercity Complexity: Medium
Problem description
The Sustainability Atlas currently does not provide analytics at the methodology level. When users explore a methodology, there is no dashboard showing how that methodology performs across all projects that use it. As a result, users cannot easily evaluate the adoption, impact, or performance of a specific carbon credit methodology.
However, implementing dashboards for every methodology would require significant effort and may not be necessary for methodologies with very low usage.
Requirements
Implement methodology-specific dashboards for a limited set of high-usage methodologies first. These dashboards should provide insights into how projects using the methodology are performing.
Each dashboard should display:
Total number of projects using the methodology
Total credits issued under the methodology
Geographic distribution of project
Issuance statistics over time
Vintage distribution of credits
Average project performance metrics (where applicable)


Dashboards should initially be created for the most commonly used methodologies in the system.
To support future expansion, define threshold metrics that automatically identify candidate methodologies for a dedicated dashboard. For example, a methodology may become eligible when:
The total issued credits exceed a defined threshold, or
The number of projects using the methodology exceeds a defined threshold.
Definition of done
Dedicated dashboards exist for a selected set of high usage methodologies.
Dashboards display aggregated project data, issuance statistics, and methodology level insights.
A defined threshold mechanism exists to identify additional methodologies that qualify for dashboards in the future.
Dashboards are accessible from both the Methodology Explorer and project pages.


Acceptance criteria
[ ] Dedicated dashboards are implemented for a limited set of high-usage methodologies.
[ ] The dashboard displays: total projects count, total credits issued, geographic distribution, issuance trend over time, and vintage distribution.
[ ] The dashboard is accessible from the Methodology Explorer listing and from individual project pages.
[ ] Dashboard data updates automatically as new projects and issuances are indexed.
[ ] Performance is acceptable dashboard loads within 5 seconds for methodologies with 100+ projects.

