# Chapter 5: Equation Mapping and Parameter Identification

After completing the analysis approach in Chapter 4, we faced the challenge of extracting all the mathematical components from VM0033's 130-page methodology. The document contained dozens of equations scattered across different sections, with complex dependencies between parameters that weren't always obvious. This chapter shares the recursive analysis approach we developed to systematically map every calculation and identify all required parameters.

The recursive analysis technique works backwards from the final calculation goal to identify every single input needed. Instead of trying to read through equations linearly, we start with what we want to calculate and trace backwards until we reach basic measured values or user inputs. This approach ensured we didn't miss any dependencies and helped us understand how all the calculations fit together.

## Understanding the Recursive Analysis Approach

When we first looked at VM0033's main equation, it seemed straightforward:

**NERRWE = GHGBSL - GHGWPS + FRP - GHGLK**

Where:
- NERRWE = Net CO₂e emission reductions from the wetland project activity
- GHGBSL = Net CO₂e emissions in the baseline scenario  
- GHGWPS = Net CO₂e emissions in the project scenario
- FRP = Fire reduction premium (bonus for reducing fire risk)
- GHGLK = Leakage emissions

But each of these terms turned out to have its own complex calculations. GHGBSL alone involved multiple sub-calculations for different types of emissions, time periods, and restoration activities. We quickly realized we needed a systematic way to trace through all these dependencies.

**The Recursive Process We Used**:
1. **Start with final goal**: NERRWE (what we ultimately want to calculate)
2. **Identify direct dependencies**: GHGBSL, GHGWPS, FRP, GHGLK
3. **For each dependency, repeat the process**: What do we need to calculate GHGBSL?
4. **Continue until reaching basic inputs**: Measured values, user inputs, or default factors
5. **Document everything**: Create lists and diagrams showing all relationships

This process revealed that calculating NERRWE for a mangrove project requires hundreds of individual parameters and intermediate calculations, many of which weren't obvious from just reading the methodology sequentially.

### Why This Approach Worked

**Comprehensive Coverage**: Working backwards ensured we found every required input, even parameters that were buried deep in sub-calculations or referenced indirectly through multiple layers.

**Logical Implementation Order**: Understanding dependencies helped us plan implementation sequence - we knew we needed basic measurements before intermediate calculations, and intermediate calculations before final results.

**Error Prevention**: The dependency mapping showed us where validation should happen at each step, rather than only discovering problems at the final calculation stage.

## Parameter Classification System

As we traced through VM0033's calculations, we realized we needed to organize the hundreds of parameters we were discovering. We developed a classification system that helped us understand what data users would need to provide and when.

**Parameter Categories We Used**:

### Monitored Parameters
These are values that project developers collect through field measurements or laboratory analysis. The Allcot ABC Mangrove project shows how these measurements connect to actual calculations:

**Tree Measurements**: The project tracks baseline biomass (ABSL,i) and project biomass (AWPS,i) for each stratum. For example, Stratum 1 starts with 1149 t C/ha baseline biomass, while Stratum 3 has 2397 t C/ha - these differences required separate tracking because they feed into different calculation pathways.

**Soil Measurements**: Soil sampling provides bulk density (BD), organic matter content (%OMsoil), and carbon content (%Csoil) that the recursive analysis revealed are needed for soil carbon change calculations. The project requires "stratum and horizon average" values since conditions vary within each restoration area.

**Site Conditions**: Sediment accretion rates (SA) and ecosystem classifications affect growth projections and carbon accumulation calculations. The recursive analysis showed these seemingly simple inputs actually influence multiple calculation branches.

**Project Activity Data**: Area measurements for each stratum (ranging from 1090 to 2222 hectares in the Allcot project) become critical because all carbon calculations get multiplied by area - missing or incorrect area data would invalidate all results.

### User-Input Parameters  
These are project-specific values that users provide during setup or periodically update:

**Project Description**: Project area size, crediting period length, restoration activities planned, geographic location.

**Management Decisions**: Choice of monitoring frequency, selection of calculation methods where VM0033 provides options, decisions about which optional calculations to include.

**Economic Data**: Costs for fossil fuel use calculations (needed for AR-Tool05), labor and equipment information for project emission calculations.

### Default Values
VM0033 provides standard values that can be used when site-specific measurements aren't available:

**Growth Factors**: Default allometric equations for different mangrove species, default root-to-shoot ratios, standard wood density values.

**Emission Factors**: Default factors for methane and nitrous oxide emissions, fossil fuel emission factors from AR-Tool05, decomposition rates for different organic matter types.

**Conversion Factors**: Units conversions, carbon content factors, global warming potential values for different greenhouse gases.

### Calculated Parameters
These values get computed from other parameters using VM0033's equations:

**Intermediate Calculations**: Area-weighted averages across different project zones, annual growth increments, cumulative totals over time periods.

**Complex Dependencies**: Parameters that depend on multiple inputs and conditional logic, such as eligibility determinations that vary based on site conditions and project activities.

## Building Parameter Dependency Trees

The most challenging part of our recursive analysis was mapping how parameters depend on each other. Some dependencies were simple and direct, while others involved complex conditional logic or calculations that changed over time.

**Simple Dependencies**: Many parameters have straightforward relationships. For example, total project carbon stock depends on individual tree biomass calculations, which depend on DBH measurements and species-specific allometric equations.

**Conditional Dependencies**: VM0033 includes many calculations that only apply under certain conditions. Fire reduction premiums only apply if projects reduce fire risk. Methane emission calculations depend on whether soil stays flooded or gets drained.

**Time-Dependent Relationships**: Many calculations change over time as trees grow and conditions change. We had to map not just what parameters were needed, but when they were needed and how they changed over the project lifetime.

### Dependency Mapping Process

**Visual Mapping**: We created flowcharts and tree diagrams showing how parameters related to each other. This helped us see the big picture and identify where we might have missed connections.

**Calculation Sequences**: We documented the order in which calculations need to happen, ensuring that required inputs are available before calculations that depend on them.

**Validation Points**: The dependency trees showed us where to include validation checks - if a parameter fails validation, which calculations would be affected, and how to provide helpful error messages.

## Working Through VM0033's Key Calculations with Allcot Project Examples

Let me walk through how we applied recursive analysis to VM0033's main calculation components, using the actual Allcot ABC Mangrove project to show how boundary decisions simplify the recursive analysis.

### Baseline Emissions (GHGBSL) Analysis

The Allcot project made a key decision that simplified baseline calculations: "Does the project quantify baseline emission reduction? = False". This eliminated entire calculation branches from our recursive analysis.

**What This Decision Meant**: Instead of calculating emissions from continued degradation, the project only claims benefits from restoration activities. This removed complex soil carbon loss calculations that would have required:
- Peat depletion rates (not applicable - all mineral soil)  
- Soil organic carbon loss rates
- Temporal boundary calculations (PDT and SDT both = 0)

**Simplified Baseline for Allcot**: With mineral soil across all strata and no baseline emission reduction claims, the baseline scenario becomes straightforward - track existing biomass levels (1149, 2115, 2397, 1339 t C/ha across the four strata) without complex degradation modeling.

**Recursive Analysis Benefit**: By starting with NERRWE and working backwards, we discovered early that the boundary decisions eliminated major calculation branches, allowing us to focus implementation effort on the actual requirements rather than building unused functionality.

### Project Emissions (GHGWPS) Analysis

Project emissions include both the carbon benefits from restoration and any emissions caused by project activities.

**Carbon Benefits (Negative Emissions)**:
- **Tree Growth**: Mangroves sequester carbon as they grow, calculated using AR-Tool14 equations
- **Soil Improvement**: Restoration improves soil conditions, reducing carbon loss rates

**Project Activity Emissions (Positive Emissions)**:
- **Fossil Fuel Use**: Boats, equipment, and transportation for project activities (calculated using AR-Tool05)
- **Disturbance Effects**: Temporary emissions from site preparation activities

**Parameter Dependencies We Mapped**:
- Tree growth rates (species-specific, site conditions)
- Fuel consumption for project activities (equipment types, distances, frequencies)
- Soil improvement rates (depends on restoration techniques and site conditions)

### Tools Integration Through Recursive Analysis

VM0033 references external tools (AR-Tool05, AR-Tool14, AFLOU) that have their own parameter requirements. Recursive analysis helped us understand how these tools fit into the overall calculation framework.

{% hint style="info" %}
**Calculation Reference**: See the complete equation mapping and parameter dependencies in our [VM0033 test artifact](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx) and [parsed methodology](../../_shared/artifacts/VM0033-Methodology.md) available in the [Artifacts Collection](../../_shared/artifacts/README.md).
{% endhint %}

**AR-Tool14 for Biomass Calculations**:
- **Inputs Required**: Tree diameter measurements, species identification, site conditions
- **Outputs Provided**: Above-ground and below-ground biomass estimates
- **Integration Point**: Biomass outputs feed into project emission calculations

**AR-Tool05 for Fossil Fuel Emissions**:
- **Inputs Required**: Equipment types, fuel consumption rates, activity frequencies
- **Outputs Provided**: CO₂ emissions from project activities
- **Integration Point**: Fossil fuel emissions get added to project emission totals

## Handling Conditional Calculations and Alternative Methods

VM0033 includes many situations where calculations depend on project-specific conditions or where multiple calculation methods are available. Our recursive analysis had to account for these variations, and the Allcot ABC Mangrove project provides concrete examples of how these decisions affect implementation.

**Allcot ABC Mangrove Project Boundary Decisions**:

From the project boundary analysis in our test artifact, the Allcot ABC Mangrove project made specific choices about what to include in calculations:

**Carbon Pools Included**:
- **Above-ground tree biomass (CO₂)**: Included - This is the main carbon benefit from planting mangroves
- **Below-ground tree biomass (CO₂)**: Included - Root systems store significant carbon in mangrove restoration
- **Soil organic carbon**: Excluded in baseline, Included in project - The project improves soil conditions over time

**Carbon Pools Excluded**:
- **Litter and Dead Wood**: Excluded - Methodology allows these to be optional for wetland restoration
- **Wood Products**: Excluded - No harvesting planned in the mangrove restoration project
- **Non-tree Biomass**: Excluded - Focus is on tree restoration, not herbaceous vegetation

**Greenhouse Gas Sources**:
- **Methane (CH₄) from soil microbes**: Excluded - Conservatively omitted to simplify calculations
- **Nitrous oxide (N₂O)**: Excluded - Also conservatively excluded
- **Fossil fuel emissions**: Excluded - Mangrove planting doesn't require heavy machinery

**Quantification Approach Choices**:

The Allcot project made specific methodological choices that affected parameter requirements:

**Soil Carbon Approach**: "Total stock approach" - This means comparing final soil carbon stocks rather than tracking annual loss rates
**Baseline Emission Reductions**: False - The project doesn't claim benefits from stopping degradation, only from restoration activities  
**NERRWE-max Cap**: False - No maximum cap on annual credit generation
**Fire Reduction Premium**: False - No fire risk reduction claimed (this removed all fire-related parameters from our implementation)

### Conditional Parameter Logic from Allcot Project

**Soil Type Conditions**: All four strata in the Allcot project have "Mineral soil" type, which means:
- Peat-related parameters (Depthpeat,i,t0, Ratepeatloss-BSL,I) are "Not applicable"  
- Soil disturbance parameters don't apply
- Temporal boundary calculations are simplified (PDT = 0, SDT = 0 for all strata)

**Project Activity Dependencies**: Since Fire Reduction Premium = False:
- All fire-related emission factors are excluded
- GWP factors for CH₄ and N₂O only needed if soil methane/nitrous oxide included
- Burning emission calculations completely skipped

**Site-Specific vs. Default Values**: The Allcot project required site-specific measurements for:
- Soil bulk density (BD) - "User provide stratum and horizon average in the value applied field"
- Soil carbon content (%OMsoil, %Csoil) - Collected through soil sampling data upload
- Tree measurements for biomass calculations (ABSL,i and AWPS,i values)

### Implementation Simplifications

**Boundary Condition Benefits**: The Allcot project's boundary choices significantly simplified our implementation:
- No peat soil calculations needed (all mineral soil)
- No fire premium calculations (eliminated ~15 parameters)
- No wood product calculations (eliminated long-term storage complexity)
- No fossil fuel tracking for project activities (simple planting operation)

**Monitoring Frequency**: The project uses annual monitoring with field measurements for tree growth, avoiding the need for complex growth modeling between measurement periods.

**Stratum Management**: Four distinct strata with different baseline biomass values (1149, 2115, 2397, 1339 t C/ha), each requiring separate parameter tracking but using the same calculation procedures.

### Managing Calculation Alternatives

**Implementation Strategy**: Rather than trying to implement every possible variation initially, we focused on the most common approaches for mangrove restoration projects. This kept our initial implementation manageable while still meeting methodology requirements.

**Future Expansion**: The dependency maps we created during recursive analysis provide roadmaps for adding additional calculation options later as needed.

## Creating Documentation and Validation Framework

The recursive analysis process generated extensive documentation that became essential for both implementation and ongoing maintenance.

**Parameter Documentation**: For each parameter we identified, we documented:
- Definition and units
- Data source (measured, user input, or default)
- Validation requirements (ranges, formats, dependencies)
- When it's used in calculations
- How it relates to other parameters

**Calculation Flowcharts**: We created visual diagrams showing how data flows through the calculation system from basic inputs to final results. These flowcharts helped us:
- Verify our understanding of VM0033's requirements
- Plan implementation sequence
- Design user interfaces that collect information in logical order
- Create validation checks at appropriate points

**Validation Logic**: The dependency trees revealed exactly where validation should happen:
- **Input Validation**: Check individual parameters as users enter them
- **Intermediate Validation**: Verify calculated values make sense before using them in subsequent calculations
- **Final Validation**: Confirm overall results are reasonable and meet methodology requirements

## Practical Lessons from VM0033 Implementation

**Start Simple, Build Complexity**: We initially tried to map every possible calculation path in VM0033, which was overwhelming. It worked better to start with the most basic mangrove restoration scenario and add complexity gradually.

**Documentation is Critical**: The recursive analysis generates a lot of information. We learned to document everything systematically because details that seemed obvious at the time became confusing weeks later during implementation.

**Test Understanding Early**: We regularly tested our understanding by working through example calculations manually. This helped us catch misunderstandings in the recursive analysis before they became implementation problems.

**Plan for Iteration**: Our first attempt at recursive analysis missed some dependencies and misunderstood some relationships. Building in time for multiple iterations helped us refine our understanding and improve the parameter mapping.

## From Parameter Mapping to Implementation Planning

The recursive analysis and parameter identification work creates the foundation for the tool integration and test artifact development covered in the next chapters.

**Tool Integration Preparation**: Understanding parameter dependencies helps identify which external tools are needed and how they integrate with methodology-specific calculations.

**Test Artifact Requirements**: The complete parameter lists and calculation sequences become the basis for creating comprehensive test spreadsheets that validate implementation accuracy.

**Schema Design Foundation**: Although schema design comes in Part III, the parameter classification and dependency mapping from this chapter directly informs what data structures and validation rules we'll need.

---

## Parameter Mapping Summary and Next Steps

{% hint style="success" %}
**Mathematical Foundation Complete**: You now understand the systematic approach we used to extract and organize all mathematical components from VM0033.
{% endhint %}

**Key Analysis Outcomes**:
- [ ] Recursive analysis technique for complete dependency mapping
- [ ] Parameter classification system (monitored, user-input, default, calculated)
- [ ] Dependency tree construction with validation point identification
- [ ] Conditional calculation management and alternative method handling
- [ ] Documentation framework for implementation support
- [ ] Integration understanding for external tool requirements

**Preparation for Chapter 6**: The parameter dependencies and tool integration points identified in this chapter become the focus of Chapter 6, where we'll cover systematic integration of AR-Tool05, AR-Tool14, and AFLOU non-permanence risk tool.

**Real-World Application**: While we used VM0033 as our example, the recursive analysis technique works for any methodology with complex calculations. The approach of starting from final results and working backwards systematically ensures comprehensive coverage regardless of methodology complexity.

{% hint style="info" %}
**Implementation Reality**: This recursive analysis work took several weeks during VM0033 digitization, but it prevented months of problems later by ensuring we understood all dependencies before starting implementation.
{% endhint %}