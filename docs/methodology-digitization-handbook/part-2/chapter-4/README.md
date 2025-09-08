# Chapter 4: Methodology Analysis and Decomposition

When we first tackled digitizing VM0033, we quickly realized that jumping straight into coding or configuration would be overwhelming. A 130-page methodology document with complex calculations needed a systematic approach to break it down into manageable pieces. This chapter shares the analysis approach we developed during VM0033 digitization - what worked, what we learned, and how you can apply these techniques to other methodologies.

The analysis process transforms a complex PDF into organized components ready for digital implementation. Rather than trying to understand everything at once, we found it more effective to use structured reading techniques that focus on the most important sections for digitization while building understanding progressively.

## Structured Reading Approach for Methodology Analysis

During VM0033 digitization, we developed a reading approach that prioritizes sections based on their importance for digital implementation. This approach emerged from trial and error - we initially tried to understand everything equally, which led to information overload.

**Reading Priority Order We Used**:
1. **Applicability Conditions** - Tells us what projects can use this methodology
2. **Quantification of GHG Emission Reductions and Removals** - Contains all the math we need to implement
3. **Monitoring** - Defines what data users need to collect
4. **Project Boundary** - Shows what's included in calculations
5. **Baseline Scenario** - Explains the reference point for calculations

This order worked well because it builds understanding logically. We need to know what projects qualify before diving into calculations, and we need to understand the calculations before figuring out how to collect the required data.

**First Pass - Structure Mapping**: Start by reading the table of contents to understand how the methodology is organized. VM0033 follows the standard VCS format with 10 main sections, but we found that Section 8 (Quantification) contains most of the mathematical complexity we needed to implement.

**Second Pass - Core Section Focus**: Read the five priority sections thoroughly, taking notes on requirements that need to be implemented digitally. During this pass, we identified calculation procedures, parameter definitions, decision logic, and validation rules that would become digital components.

**Third Pass - Integration Details**: Read the remaining sections to understand how the methodology connects to external tools and handles edge cases. This reading helped us understand dependencies and special situations we needed to account for.

### Note-Taking Techniques That Worked

**Focus on Digital Implementation**: As we read, we kept asking "What here needs to be automated?" and "What decisions does a user need to make?" This helped us identify the specific elements that would become features in our digital implementation.

**Consistent Marking System**: We developed a simple system for marking different types of content - equations got one color, parameters another, decision points a third. This made it easier to find information later when we were building the digital version.

**Cross-Reference Tracking**: We noted how different sections referenced each other, especially how the quantification section built on the boundary definitions and how monitoring requirements supported calculations. These connections were important for making sure our digital implementation maintained the methodology's logic.

## Understanding the Three-Actor Workflow

Most carbon methodologies, including VM0033, work within a standard three-actor certification process. Understanding this workflow was crucial for designing our digital implementation because the platform needed to support all three actors and their interactions.

**The Three Actors**:

**Standard Registry (Verra in VM0033's case)**: The organization that maintains the methodology and oversees the certification process. They approve projects, oversee validation and verification, and issue the final carbon credits.

**Validation and Verification Body (VVB)**: Independent auditors who check that projects comply with the methodology requirements. They validate project designs initially and verify monitoring results ongoing.

**Project Developer**: The organization implementing the restoration project and seeking carbon credits. For VM0033, this would be whoever is planting and maintaining the mangroves.

**How They Interact**:
1. **Project Registration**: Project developer submits project documents to the registry
2. **Validation**: Project developer hires a VVB to validate their project design
3. **Project Approval**: Registry approves the project based on VVB validation
4. **Monitoring**: Project developer collects data and submits monitoring reports
5. **Verification**: Project developer hires VVB to verify their monitoring results
6. **Credit Issuance**: Registry issues credits based on VVB verification

When we designed the Guardian policy for VM0033, we built this workflow into the platform so that each actor has appropriate permissions and can only see and do what they're supposed to according to their role.

### VM0033 Specific Considerations

For the Allcot ABC Mangrove project, we focused on mangrove restoration as the primary activity. The project involves planting mangroves in coastal areas where they had been lost or degraded. This kept our initial implementation focused rather than trying to handle all possible restoration activities that VM0033 theoretically allows.

The three-actor workflow works well for mangrove projects because:
- Project developers can focus on planting and monitoring mangroves
- VVBs can verify that restoration activities meet VM0033 requirements
- The registry can issue credits knowing the work has been independently validated

## Parameter Extraction and Organization

One of the most time-consuming parts of analysis was identifying all the parameters (data inputs) that users would need to provide. VM0033 has many parameters scattered throughout the document, and some are used in multiple calculations.

**Parameter Types We Identified**:

**Monitored Parameters**: Data that project developers collect through measurements. For mangrove projects, this includes things like tree diameter measurements, survival rates, soil samples, and water level measurements.

**User-Input Parameters**: Project-specific information that users provide during setup. This includes project area size, crediting period length, restoration activities planned, and location details.

**Default Values**: Standard values provided by VM0033 that can be used when site-specific measurements aren't available. These include default growth rates, carbon content factors, and emission factors.

**Calculated Parameters**: Values that get computed from other parameters using equations in the methodology. These form chains of calculations that we needed to map carefully.

### Parameter Organization Approach

**Systematic Extraction**: We went through each section methodically, making lists of every parameter mentioned, along with its definition, units, and where it gets used. This was tedious but essential for making sure we didn't miss anything.

**Reuse Identification**: Many parameters appear in multiple calculations. Identifying these reuse opportunities helped us design efficient data collection where users enter information once and it gets used wherever needed.

**Validation Requirements**: Each parameter has requirements about valid ranges, formats, or dependencies. We documented these during analysis because they would become validation rules in our digital implementation.

## Introduction to Recursive Analysis

When we first looked at VM0033's final calculation equation, it seemed simple. But we quickly realized that each term in that equation depends on other calculations, which depend on still other calculations, creating a complex web of dependencies.

**Starting Point**: VM0033's goal is calculating Net GHG Emission Reductions and Removals (NERRWE). The basic equation is:

NERRWE = BE - PE - LK

Where:
- NERRWE = Net emission reductions from the wetland project
- BE = Baseline emissions (what would have happened without the project)
- PE = Project emissions (emissions from project activities)
- LK = Leakage (emissions that might occur elsewhere because of the project)

**The Challenge**: Each of these terms (BE, PE, LK) has its own complex calculations with many sub-components. To implement this digitally, we needed to trace back from the final answer to identify every piece of data a user would need to provide.

**Recursive Approach**: Starting with NERRWE, we asked "What do we need to calculate this?" Then for each dependency, we asked the same question, continuing until we reached basic measured values or user inputs. This created a tree-like structure showing all the calculation dependencies.

### Benefits of This Approach

**Complete Parameter Discovery**: Working backward from final results ensured we found all required inputs, even ones that are referenced indirectly through multiple calculation layers.

**Logical Implementation Order**: Understanding dependencies helped us sequence implementation so that basic inputs are collected before calculations that depend on them.

**Validation Points**: The dependency tree showed us where validation should happen - we could catch problems early rather than only discovering them at the final calculation stage.

## Tools and External References

VM0033 references several external calculation tools that we needed to understand and integrate. During our first digitization attempt, we implemented the ones that were most essential for the mangrove restoration focus.

{% hint style="info" %}
**Reference Materials**: For detailed VM0033 analysis, consult the [parsed methodology document](../../_shared/artifacts/VM0033-Methodology.md) and [test case artifact](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx) in our [Artifacts Collection](../../_shared/artifacts/README.md).
{% endhint %}

**Tools We Implemented**:

**AR-Tool05**: This CDM tool calculates emissions from fossil fuel use during project activities. For mangrove projects, this covers emissions from boats, equipment, and transportation used during planting and monitoring.

**AR-Tool14**: This CDM tool estimates carbon stocks in trees and shrubs using standard equations. We used this for calculating carbon storage in mangrove biomass as the trees grow.

**AFLOU Non-permanence Risk Tool**: This VCS tool assesses the risk that carbon benefits might be reversed. For mangrove projects, this considers risks like storm damage, disease, or land use changes.

### Tool Integration Approach

**Understanding Tool Purpose**: For each tool, we figured out what specific problem it solves and how that fits into the overall VM0033 calculation framework.

**Data Flow Mapping**: We traced how data flows between VM0033 calculations and the external tools - what information goes in, what results come out, and how those results get used in other calculations.

**Implementation Decisions**: Rather than trying to implement every referenced tool perfectly, we focused on the core functionality needed for mangrove projects. This kept our initial implementation manageable while still meeting methodology requirements.

## VM0033 Analysis Walkthrough

Let's walk through how we applied these analysis techniques to specific parts of VM0033, using examples from our actual digitization work.

**Applicability Analysis**: VM0033 Section 4 defines what projects can use the methodology. For mangrove restoration, the key requirements are that projects restore degraded tidal wetlands through activities like replanting native species and improving hydrological conditions. We identified the specific criteria that our digital implementation needed to check during project registration.

**Calculation Structure**: Section 8 contains VM0033's mathematical core. We found that baseline emissions calculations (what would happen without restoration) were quite complex, involving soil carbon loss, methane emissions, and biomass decay. Project emissions were simpler for mangrove planting but still required careful tracking of fossil fuel use and disturbance effects.

**Monitoring Requirements**: Sections 9.1 and 9.2 define what data projects need to collect. For mangrove restoration, this includes regular measurements of tree survival, growth rates, soil conditions, and water levels. We organized these into data collection schedules that could be built into the Guardian interface.

### Practical Lessons Learned

**Start Simple**: We initially tried to handle all possible restoration activities VM0033 allows, but this created too much complexity. Focusing on mangrove planting first gave us a working system that we could expand later.

**Document Everything**: Even seemingly small details about parameter definitions or calculation procedures became important during implementation. Good documentation during analysis saved time later.

**Test Understanding**: We regularly tested our understanding by trying to work through example calculations manually. This helped us catch misunderstandings before they became implementation problems.

## From Analysis to Implementation Planning

The analysis work creates a foundation for the more detailed equation mapping and parameter identification that comes in Chapter 5. Here's how the analysis results feed into subsequent work.

**Parameter Lists**: The parameters we identified during analysis become the basis for detailed dependency mapping in Chapter 5.

**Calculation Structure**: Our understanding of how VM0033's calculations fit together guides the recursive analysis work that systematically maps every mathematical dependency.

**Tool Integration**: The external tools we identified need detailed integration planning, which we'll cover in Chapter 6.

**Validation Framework**: The validation requirements we identified during analysis inform the test artifact development in Chapter 7.

---

## Analysis Summary and Next Steps

{% hint style="success" %}
**Analysis Foundation Complete**: You now understand the systematic approach we used to break down VM0033 into implementable components.
{% endhint %}

**Key Analysis Outcomes**:
- [ ] Structured methodology reading with focus on implementation requirements
- [ ] Three-actor workflow understanding with role and permission implications
- [ ] Parameter extraction with classification and reuse opportunities identified
- [ ] Introduction to recursive analysis concepts for dependency mapping
- [ ] External tool identification with integration requirements
- [ ] Implementation prioritization based on project focus (mangrove restoration)

**Preparation for Chapter 5**: Your parameter extraction work and understanding of calculation structure from this chapter will be essential for the detailed equation mapping we'll cover next. Chapter 5 builds directly on this foundation to create complete mathematical dependency maps.

**Applying to Other Methodologies**: While we used VM0033 as our example, these analysis techniques apply to other environmental methodologies. The structured reading approach, parameter extraction methods, and recursive analysis concepts work for any methodology you might want to digitize.

{% hint style="info" %}
**Learning from Experience**: These techniques represent what we learned during VM0033 digitization. They worked for us, but you might find improvements or adaptations that work better for your specific methodology or implementation approach.
{% endhint %}