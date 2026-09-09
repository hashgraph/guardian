# Chapter 7: Test Artifact Development

Creating comprehensive test artifacts was one of the most valuable parts of our VM0033 digitization work, and we couldn't have done it without Verra's help. The test artifacts became our foundation for schema design, calculation verification, and ongoing validation. This chapter explains how we worked with Verra to develop test cases using real Allcot project data and how these artifacts guided every aspect of our implementation.

The collaboration with Verra was crucial because they provided the methodology expertise needed to create realistic test scenarios, while Allcot provided real project data from their ABC Mangrove Senegal project. This combination gave us authentic test cases that reflected actual project conditions rather than hypothetical examples we might have created ourselves.

## The Collaborative Approach with Verra

When we started digitization work, we realized that creating accurate test cases would require deep methodology expertise that we didn't have. We needed someone who understood VM0033's intricacies and could create test scenarios that properly exercised all the calculation pathways we had identified through recursive analysis.

**Verra's Contribution**: Verra brought methodology expertise to help us understand which test scenarios would be most valuable and how to structure test cases that would validate both individual calculations and overall methodology compliance.

**Allcot's Data Contribution**: Allcot provided real project data from their ABC Mangrove Senegal project, including:
- Actual PDD data with site-specific parameters
- Real emission reduction calculations from their project development work
- Authentic assumptions about growth rates, mortality, and site conditions
- Practical boundary condition decisions for a working mangrove project

**Our Role**: We provided the technical framework needs - what parameters we needed, how calculations would be structured in Guardian, and what validation scenarios would help us verify digital implementation accuracy.

**The Result**: Two comprehensive Excel artifacts that became our validation benchmarks - the detailed test case artifact and the original ER calculations from Allcot's PDD work.

### Why This Collaboration Worked

**Real Project Grounding**: Using actual Allcot project data meant our test cases reflected real-world conditions and decision-making rather than theoretical scenarios.

**Methodology Validation**: Verra's involvement ensured our test cases properly interpreted VM0033 requirements and followed accepted calculation procedures.

**Implementation Focus**: Our technical requirements kept the test development focused on what we actually needed for digitization rather than creating comprehensive academic examples.

## Understanding the Allcot ABC Mangrove Project Data

The Allcot ABC Mangrove Senegal project provided an ideal test case because it represented a straightforward mangrove restoration approach with well-documented assumptions and calculations.

**Project Characteristics**:
- **Total Area**: 7,000 hectares across 4 strata with different baseline conditions
- **Planting Approach**: Manual propagule planting by local communities - no heavy machinery
- **Species Focus**: Rhizophora mangle (red mangrove) with known allometric equations
- **Timeframe**: 40-year crediting period starting in 2022
- **Mortality Assumptions**: 50% mortality overall, with specific patterns over time

**Key Project Parameters from ER Calculations**:
- **Planting Density**: 5,500 trees per hectare initially planted
- **Growth Model**: Chapman-Richards function for DBH growth over time
- **Allometric Equation**: Ln(AGB) = 5.534244 + 2.404770 * Ln(DBH)
- **Root:Shoot Ratio**: 0.29 for below-ground biomass calculations
- **Carbon Fraction**: 0.47 for converting biomass to carbon content
- **Soil Carbon Rate**: 1.83 t C/ha/year after allochthonous carbon deduction

**Boundary Simplifications**:
- No fire reduction premium (eliminated fire calculations)
- No fossil fuel emissions (simple planting activities)  
- Mineral soil only (no peat calculations)
- No wood products (no harvesting planned)

### How Project Data Informed Test Scenarios

**Realistic Parameter Ranges**: The Allcot data showed us realistic ranges for key parameters - growth rates that reflect actual site conditions, mortality patterns based on field experience, and carbon accumulation rates based on literature and site measurements.

**Calculation Complexity**: The project showed us how many calculations were actually needed vs. the full VM0033 complexity. This helped us focus test development on calculations that would actually be used.

**Multi-Stratum Scenarios**: With 4 different strata having different baseline biomass levels (1149, 2115, 2397, 1339 t C/ha), we could test how calculations handle different starting conditions and scaling across project areas.

## Test Artifact Structure and Organization

The test artifacts we developed with Verra create a comprehensive validation framework organized around VM0033's calculation structure.

**Primary Test Case Artifact**: `VM0033_Allcot_Test_Case_Artifact.xlsx`
This artifact contains the complete parameter set and calculation framework needed for Guardian implementation:

**Project Boundary Definition**: Documents exactly which carbon pools and emission sources are included/excluded, providing the conditional logic needed for Guardian's schema design.

**Quantification Approach Selection**: Shows which calculation methods are used (field data vs. proxies, stock approach vs. flow approach) and when different parameters are required.

**Stratum-Level Parameters**: Complete parameter sets for all 4 project strata, showing how site conditions vary and how this affects calculation requirements.

**Temporal Boundaries**: Peat depletion time (PDT) and soil organic carbon depletion time (SDT) calculations for each stratum, though simplified for mineral soil conditions.

**Annual Calculation Framework**: Year-by-year calculations from 2022 to 2061 showing how parameters change over time and how calculations scale across the 40-year crediting period.

**Monitoring Requirements**: Complete parameter lists organized by validation vs. monitoring periods, showing when different data needs to be collected.

### Supporting ER Calculations Artifact

**Original Allcot Calculations**: `ER_calculations_ABC Senegal.xlsx`
This artifact contains the original project calculations that Allcot developed for their PDD:

**Assumptions and Parameters**: Detailed documentation of all project assumptions including growth models, mortality rates, allometric equations, and site-specific factors.

**Growth Projections**: Complete DBH growth projections using Chapman-Richards model, providing year-by-year diameter estimates that feed into biomass calculations.

**Calculation Results**: Annual emission reduction calculations over the 40-year period, providing expected results that our digital implementation should match.

**Validation Benchmarks**: Final totals and annual averages that became our accuracy targets during implementation testing.

## How Test Artifacts Guided Schema Design

The test artifacts became our primary reference during Guardian schema development because they showed us exactly what data users would need to provide and how it would be structured.

**PDD Schema Requirements**: The project boundary and quantification approach selections from the test artifact directly translated into conditional field requirements in our PDD schema design.

**Monitoring Report Structure**: The annual calculation requirements showed us which parameters needed to be collected each year vs. only at validation, informing our monitoring report schema organization.

**Parameter Grouping**: The test artifact's organization by strata, time periods, and calculation components helped us design schema sections that match how users actually think about project data.

**Validation Logic**: The conditional parameter requirements (like "when fire reduction premium = true") became validation rules in our schema design that show/hide fields based on user selections.

### From Test Artifact to Guardian Implementation

**Direct Translation**: Many sections of the test artifact could be directly translated into Guardian schema fields. For example, the stratum-level input parameters became repeating sections in our project schema.

**Calculation Verification**: The test artifact calculations became our verification benchmark - our Guardian implementation needed to produce the same results using the same input parameters.

**User Experience Insights**: Seeing how parameters were organized in the test artifact helped us understand how to structure Guardian forms and data collection workflows.

## Verification and Validation Process

The test artifacts enabled systematic verification of our Guardian implementation by providing known-good calculation results that we could compare against our digital calculations.

**Baseline Verification**: Using the test artifact's baseline biomass values and parameters, we verified that our Guardian calculations produced matching baseline calculations.

**Project Calculation Testing**: The annual growth projections and biomass calculations from the test artifact became our benchmark for testing AR-Tool14 integration and biomass calculation accuracy.

**Net Emission Reductions**: The final ER calculations provided year-by-year targets that our complete Guardian implementation needed to match within acceptable precision tolerances.

**Parameter Validation**: The test artifact showed us which parameter combinations were valid and which should trigger validation errors, informing our schema validation rule design.

### Testing Methodology We Used

**Individual Component Testing**: We tested each calculation component (baseline, project, leakage) separately using test artifact parameters to isolate any calculation errors.

**Integration Testing**: After individual components worked correctly, we tested the complete calculation chain using full test artifact scenarios.

**Precision Analysis**: We documented acceptable precision differences between our calculations and test artifact results, accounting for rounding differences and calculation sequence variations.

**Edge Case Testing**: The test artifact parameters helped us identify edge cases (like zero values, boundary conditions) that needed special handling in our implementation.

## Real-World Application Benefits

Having comprehensive test artifacts based on real project data provided benefits throughout our digitization work and continues to be valuable for ongoing development.

**Implementation Confidence**: Knowing our calculations matched real project calculations gave us confidence that our Guardian implementation would work correctly for actual projects.

**Schema Validation**: The test artifacts helped us verify that our Guardian schemas could handle real project complexity and data requirements.

**User Testing**: When we tested Guardian with potential users, having realistic test data made the testing sessions much more meaningful than using hypothetical examples.

**Documentation Reference**: The test artifacts became our reference for writing user documentation and help text, providing concrete examples of how parameters are used.

**Quality Assurance**: Ongoing development work uses the test artifacts as regression tests to ensure code changes don't break existing calculation accuracy.

### Long-Term Value

**Maintenance Reference**: When we need to modify calculations or add new features, the test artifacts provide a comprehensive reference for ensuring changes maintain calculation accuracy.

**Expansion Foundation**: If we extend Guardian to handle additional VM0033 features or variations, the test artifacts provide a foundation for developing additional test scenarios.

**Training Resource**: The test artifacts help new team members understand VM0033 requirements and Guardian implementation by providing concrete examples of complete calculation scenarios.

## Lessons from Test Artifact Development

**Collaboration is Essential**: We could not have created effective test artifacts without Verra's methodology expertise and Allcot's real project data. The collaborative approach was crucial for creating useful validation tools.

**Real Data Matters**: Using actual project data rather than hypothetical scenarios made our test artifacts much more valuable for validating implementation accuracy and user experience.

**Comprehensive Coverage**: Attempting to create test scenarios that cover all calculation pathways, parameter combinations, and edge cases requires systematic organization and significant effort.

**Living Documents**: Test artifacts need to be maintained and updated as understanding improves and requirements evolve. We continue to reference and occasionally update our artifacts based on implementation experience.

**Implementation Integration**: Test artifacts are most valuable when they're designed from the beginning to support the specific implementation work being done, rather than created as general methodology examples.

---

## Test Artifact Development Summary and Implementation Readiness

{% hint style="success" %}
**Validation Framework Complete**: You now understand how collaborative test artifact development creates the foundation for accurate methodology digitization.
{% endhint %}

**Key Test Development Outcomes**:
- [ ] Collaborative development approach with Verra methodology expertise and Allcot real project data
- [ ] Comprehensive test case artifact covering all VM0033 calculation components and parameter requirements  
- [ ] Original ER calculations providing validation benchmarks and expected results
- [ ] Schema design guidance through realistic parameter organization and conditional logic examples
- [ ] Verification methodology for validating digital implementation accuracy against known-good calculations
- [ ] Long-term maintenance and quality assurance framework for ongoing development

**Implementation Readiness**: The systematic analysis and planning work completed in Part II provides comprehensive foundation for technical implementation. The methodology analysis, equation mapping, tool integration, and test artifact development create detailed requirements and validation frameworks that directly support schema design and policy development.

**Real-World Validation**: Using actual project data from a real mangrove restoration project ensures that digitization work addresses practical implementation needs rather than theoretical scenarios, improving the likelihood of successful deployment and user adoption.

{% hint style="info" %}
**Collaborative Success**: The test artifact development demonstrates the value of combining technical digitization expertise with domain knowledge and real project experience to create comprehensive validation frameworks.
{% endhint %}