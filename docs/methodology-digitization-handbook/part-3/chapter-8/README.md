# Chapter 8: Schema Architecture and Foundations

Guardian's schema system is more sophisticated than simple data collection forms. When implementing VM0033, we needed to translate over 400 structured data components for wetland restoration methodology requirements into Guardian's schema architecture. This required understanding how schemas integrate with Guardian's broader platform capabilities while maintaining usability for different stakeholder types.

This chapter demonstrates schema development foundations using VM0033 implementation as a concrete example. VM0033's complexity provides practical examples of architectural patterns, design principles, and implementation approaches that apply to environmental methodology digitization more broadly.

The schema architecture establishes the foundation for translating methodology requirements from Part II analysis into working Guardian data structures. Rather than building everything at once, establishing architectural understanding first enables building schemas that handle complexity while remaining practical for real-world use.

![VM0033 Schemas](<../../../.gitbook/assets/image (68).png>)

## Guardian Schema System Foundation

Guardian schemas serve multiple functions beyond data collection. They define data structures, generate user interfaces, implement validation rules, support calculation frameworks, and create audit trails through Verifiable Credentials integration.

**Guardian Schema Functions**:

* **Data Structure Definition**: Specify exactly what information gets collected and how it's organized
* **User Interface Generation**: Automatically create forms that stakeholders use for data input
* **Validation Rule Implementation**: Ensure data meets methodology requirements before acceptance
* **Calculation Framework Support**: Provide data structures that calculation logic operates on
* **Audit Trail Creation**: Generate immutable records for every data submission and modification

VM0033 demonstrates how these functions work together. The methodology's complex calculation requirements needed schemas that could capture parameter data accurately, generate usable interfaces for Project Developers and VVBs, validate data according to VM0033 specifications, and support calculation workflows for emission reduction quantification.

**JSON Schema Integration**: Guardian builds on JSON Schema specifications for data structure definitions. Every parameter identified in Part II analysis translates into JSON Schema field definitions with appropriate types, validation rules, and relationships.

**Verifiable Credentials Structure**: Each schema generates Verifiable Credentials (VCs) that create cryptographic proof of data integrity. For VM0033, this means every project submission, monitoring report, and verification result becomes an immutable record with full audit trail capabilities.

### Schema Content Classifications

Guardian organizes schema content into five distinct types, each serving different purposes in methodology digitization. VM0033 uses all five types across its schema implementation:

**general-data**: Basic project information, stakeholder details, geographic data, and descriptive content that doesn't require complex validation. VM0033's project description sections use general-data for project locations, implementation schedules, and stakeholder consultation results.

**parameter-data**: Methodology-specific parameters with equations, units, data sources, and justifications. These components implement the mathematical framework from Part II analysis. VM0033's parameter-data includes biomass density values, emission factors, and quantification approach selections.

**validation-data**: Calculation results, emission reduction outcomes, and verification results that require special audit trail handling. VM0033's validation-data captures final carbon stock calculations, emission reduction totals, and VVB verification decisions.

**tool-integration**: External tool implementations including AR Tools, VCS modules, and methodology-specific calculation frameworks. VM0033 integrates AR Tool 5 for fossil fuel emissions and AR Tool 14 for biomass calculations through tool-integration components.

**guardian-schema**: Complex nested schemas and advanced Guardian features requiring sophisticated configuration. VM0033's monitoring period management and multi-year calculation tracking use guardian-schema features for handling temporal data relationships.

This classification system helps organize complex methodologies like VM0033 while ensuring each component uses appropriate Guardian features and validation approaches.

## Two-Part Schema Architecture

For VM0033 we implemented a two-part schema structure that separates project description from calculation implementation. This pattern worked because methodologies have foundational project information that establishes context, and calculation machinery that processes that information into emission reduction or removal results.

### Project Description Foundation

The Project Description schema establishes all foundational project information while supporting multiple certification pathways. For VM0033, this meant supporting both VCS-only projects and VCS+CCB projects through conditional logic that adapts the interface based on certification selection.

**Core Project Description Components**:

* **Project Metadata**: Title, location, timeline, proponent information, and basic project characterization
* **Certification Pathway Management**: Conditional logic supporting VCS v4.4 requirements and optional CCB benefits documentation
* **Stakeholder Information**: Project developer details, VVB assignments, and community consultation documentation
* **Methodology Implementation**: Project boundary definition, quantification approach selection, and baseline scenario establishment

VM0033's Project Description schema contains 3,779 rows of structured data. This demonstrates how complex environmental methodologies require extensive information capture while maintaining usability for stakeholder workflows.

**Why This Foundation Approach Works**: Establishing clear project context before calculations helps stakeholders understand what they're implementing and why. The foundation information also provides the context that calculation engines need to process parameters correctly.

### Calculations and Parameter Engine

The Calculations section implements VM0033's computational requirements through structured parameter management and automated calculation workflows. This architecture handles the recursive calculation dependencies identified during Part II analysis.

**Calculation Engine Components**:

**Monitoring Period Inputs**: Time-series data collection framework with 47 structured fields handling annual data requirements across 100-year crediting periods. This component manages the temporal aspects of VM0033's monitoring requirements.

**Annual Input Parameters**: Year-specific parameter tracking with 44-50 configured fields supporting VM0033's requirement for annual updates to key variables like biomass density, emission factors, and area measurements.

**Baseline Emissions Calculation**: 204-field calculation engine implementing VM0033's baseline scenario quantification including soil carbon stocks, biomass calculations, and greenhouse gas emissions across all relevant carbon pools.

**Project Emissions Calculation**: 196-203 field calculation framework processing project scenario emissions with restoration activity impacts, modified emission factors, and project-specific boundary conditions.

**Net ERR Calculation**: 21-field validation engine that processes baseline and project calculations into final emission reduction results, including leakage accounting, uncertainty deductions, and buffer requirements.

This calculation architecture handles VM0033's complex dependencies where final results depend on annual calculations, which depend on monitoring data, which depend on project-specific parameters established in the Project Description foundation.

## Guardian Field Mapping Patterns

Translating methodology parameters into Guardian field configurations requires patterns that preserve methodology integrity while generating usable interfaces. VM0033's implementation established consistent approaches for different types of methodology content.

### Standard Parameter Field Structure

Every methodology parameter from Part II analysis translates into Guardian fields using a consistent structure that captures all necessary information for implementation and validation.

**Required Parameter Fields**:

* **Description**: Clear explanation of what the parameter represents and how it's used in methodology calculations
* **Unit**: Measurement units (t CO2e, hectares, percentage) matching methodology specifications exactly
* **Equation**: Reference to specific methodology equations where the parameter appears
* **Source of data**: Methodology requirements for how this parameter should be determined
* **Value applied**: Actual parameter values, often with stratum-specific or project-specific breakdowns
* **Justification**: Required explanation for parameter selection and data source choices

For example, VM0033's BD (Biomass Density) parameter implementation:

```
Field 1 - Description: "Biomass density of vegetation in stratum i"
Field 2 - Unit: "t d.m. ha-1"
Field 3 - Equation: "Equation 15, Equation 23"
Field 4 - Source of data: "Field measurements or literature values"
Field 5 - Value applied: [Stratum-specific data table]
Field 6 - Justification: [Required text explanation]
```

This pattern ensures that every parameter implementation maintains full methodology traceability while providing clear guidance for data collection and validation.

### Conditional Logic Implementation Patterns

VM0033's multiple calculation pathways required conditional logic that shows relevant fields based on user selections while maintaining methodology coverage.

**Conditional Logic Examples from VM0033**:

**Certification Type Selection**:

* Selecting "VCS v4.4" shows core VCS requirements
* Selecting "VCS + CCB" adds community and biodiversity benefit documentation requirements
* Each pathway maintains methodology compliance while avoiding unnecessary complexity

**Quantification Approach Selection**:

* "Direct method" shows field measurement data entry forms
* "Indirect method" shows estimation parameter inputs
* Each method implements VM0033's approved calculation approaches

**Soil Emission Calculation Selection**:

* CO2 approach selection determines which soil carbon stock calculation methods appear
* CH4 and N2O approach selections control emission factor parameter visibility
* Each combination implements VM0033's flexible calculation framework

This conditional structure ensures users see only methodology-relevant fields based on their project characteristics, reducing complexity while ensuring requirements coverage.

### UX Patterns

**Progressive Disclosure**: Complex calculation parameters appear only after basic project information completion. This prevents overwhelming initial experiences while ensuring users understand project context before diving into technical details.

**Role-Based Interface**: Different stakeholder roles see appropriate field sets:

* **Project Developers** see data entry requirements with guidance
* **VVBs** see verification-focused interfaces with tabs for validation & verification reports
* **Standard Registry** sees approval-focused documentation with key decision points highlighted

**Contextual Help**: We're working on a new feature to enable field-level methodology references, calculation explanations and source justifications in Guardian schemas.

**Validation Checks**: Real-time validation feedback helps users understand data requirements and correct issues immediately rather than discovering problems during submission review.

## Next Steps

This chapter established the architectural foundation for Guardian schema development using patterns demonstrated through VM0033's production implementation. The two-part architecture, field mapping patterns, and other techniques provide the framework for implementing granular data collection effectively.

The next chapter applies these principles to PDD schema development, demonstrating how to implement project description requirements and calculation frameworks using the patterns and techniques established here.
