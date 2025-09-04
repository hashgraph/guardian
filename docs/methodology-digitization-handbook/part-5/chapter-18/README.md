# Chapter 18: Custom Logic Block Development

> Converting environmental methodology calculations into working JavaScript using Guardian's customLogicBlock

This chapter teaches how to implement emission reduction calculations using Guardian's customLogicBlock JavaScript environment. By analyzing VM0033's production calculation code, you'll learn to process validation & monitoring data and generate verified emission reductions that integrate seamlessly with policy workflows.

## Learning Objectives

After completing this chapter, you will be able to:

- Understand Guardian's customLogicBlock JavaScript execution environment(Python is also supported)
- Extract and process monitoring data from credentialSubject documents
- Implement VM0033 baseline emissions, project emissions, and net emission reduction calculations
- Map calculation results to schema fields for policy workflow integration
- Test calculation logic both outside and within Guardian environment

## Prerequisites

- Completed Part IV: Policy Workflow Design and Implementation
- Understanding of VM0033 methodology from Part I
- Basic JavaScript knowledge for environmental calculations
- Access to VM0033 artifacts: [er-calculations.js](../../_shared/artifacts/er-calculations.js) and [test case spreadsheet](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx)

## Guardian customLogicBlock Architecture

### JavaScript Execution Environment

Guardian's [customLogicBlock](../../../available-policy-workflow-blocks/customlogicblock.md) executes JavaScript within a controlled environment that processes Verifiable Credential documents. The execution pattern follows this structure:

```javascript
// Guardian customLogicBlock execution pattern
{
  "blockType": "customLogicBlock",
  "tag": "emission-reductions-calculation",
  "expression": "(function calc() {\n  // Your calculation code here\n  const documents = arguments[0] || [];\n  // Process documents and return results\n  return results;\n})"
}
```

### Document Processing Fundamentals

Every customLogicBlock receives an array of documents through `arguments[0]`. Each VC document contains:

```javascript
// Document structure in customLogicBlock
const document = {
  document: {
    credentialSubject: [
      {
        // All schema fields from PDD or monitoring reports
        project_data_per_instance: [...],
        project_boundary: {...},
        individual_parameters: {...},
        // Auto Calculate fields to be populated by calculations
        total_vcus: 0  // Set by calculation
      }
    ]
  }
};
```

### Field Access Patterns

Guardian calculations access schema fields through the credentialSubject structure. VM0033 uses this pattern:

```javascript
// Field access pattern from VM0033 er-calculations.js
function processInstance(instance, project_boundary) {
    const data = instance.project_instance;

    // Access project boundary settings
    const BaselineSoil = getProjectBoundaryValue(project_boundary, 'baseline_soil');

    // Access individual parameters
    const GWP_CH4 = getIndividualParam(data, 'gwp_ch4');

    // Access monitoring period inputs
    const SubmergenceMonitoringData = getMonitoringValue(data, 'submergence_monitoring_data');
}

// Utility functions for field access
function getProjectBoundaryValue(data, key) {
    return data.project_boundary_baseline_scenario?.[key]?.included ??
        data.project_boundary_project_scenario?.[key]?.included ??
        undefined;
}

function getIndividualParam(data, key) {
    return data?.individual_parameters?.[key] ?? undefined;
}

function getMonitoringValue(data, key) {
    return data?.monitoring_period_inputs?.[key] ?? undefined;
}
```

## VM0033 Emission Reduction Implementation

### Main Calculation Entry Point

VM0033's calculation starts with the main `calc()` function that processes multiple project instances. This implementation is extracted from the production [VM0033 policy](../../_shared/artifacts/vm0033-policy.json) customLogicBlock:

```javascript
// Main calculation function from VM0033 er-calculations.js
function calc() {
    const document = documents[0].document;
    const creds = document.credentialSubject;

    let totalVcus = 0;

    for (const cred of creds) {
        for (const instance of cred.project_data_per_instance) {
            processInstance(instance, cred.project_boundary);
            totalVcus += instance.project_instance.net_ERR.total_VCU_per_instance;
        }
        cred.total_vcus = totalVcus;
    }

    done(adjustValues(document.credentialSubject[0]));
}
```

### Baseline Emissions Calculation

The baseline emissions calculation processes multiple emission sources following VM0033 methodology:

```javascript
// Baseline emissions processing from VM0033
function processBaselineEmissions(baseline, crediting_period, baseline_soil_CH4,
    soil_CH4_approach, GWP_CH4, baseline_soil_N2O, soil_N2O_approach, GWP_N2O,
    monitoring_submergence_data, temporal_boundary) {

    // Process each monitoring year
    for (const yearRec of baseline.yearly_data_for_baseline_GHG_emissions ?? []) {
        const { year_t } = yearRec;

        // Process each stratum within the year
        for (const stratum of yearRec.annual_stratum_parameters ?? []) {
            const { stratum_i } = stratum;
            const sc = stratum.stratum_characteristics ?? {};
            const asl = stratum.annual_stratum_level_parameters ?? {};

            // AR Tool calculations integration
            asl.delta_CTREE_BSL_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_TREE;
            asl.delta_CSHRUB_BSL_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_SHRUB;
            asl.ET_FC_I_t_ar_tool_5_BSL = stratum.ar_tool_05.ET_FC_y;

            // Tree and shrub biomass calculations
            asl.delta_C_BSL_tree_or_shrub_i_t = const_12_by_44 *
                (asl.delta_CTREE_BSL_i_t_ar_tool_14 + asl.delta_CSHRUB_BSL_i_t_ar_tool_14);

            // Soil CO2 emissions calculation
            if (asl.is_soil) {
                const method = sc.co2_emissions_from_soil;

                switch (method) {
                    case "Field-collected data":
                        asl.GHGBSL_soil_CO2_i_t = -(const_44_by_12 * asl.delta_C_BSL_soil_i_t);
                        break;
                    case "Proxies":
                        asl.GHGBSL_soil_CO2_i_t = asl.GHG_emission_proxy_GHGBSL_soil_CO2_i_t;
                        break;
                    default:
                        asl.GHGBSL_soil_CO2_i_t =
                            (asl.GHGBSL_insitu_CO2_i_t ?? 0) +
                            (asl.GHGBSL_eroded_CO2_i_t ?? 0) +
                            (asl.GHGBSL_excav_CO2_i_t ?? 0);
                }
            } else {
                asl.GHGBSL_soil_CO2_i_t = 0;
            }

            // CH4 emissions from soil
            if (baseline_soil_CH4) {
                const method = soil_CH4_approach;

                switch (method) {
                    case "IPCC emission factors":
                        asl.GHGBSL_soil_CH4_i_t = asl.IPCC_emission_factor_ch4_BSL * GWP_CH4;
                        break;
                    case "Proxies":
                        asl.GHGBSL_soil_CH4_i_t = asl.GHG_emission_proxy_ch4_BSL * GWP_CH4;
                        break;
                    default:
                        asl.GHGBSL_soil_CH4_i_t = asl.CH4_BSL_soil_i_t * GWP_CH4;
                }
            } else {
                asl.GHGBSL_soil_CH4_i_t = 0;
            }

            // Total baseline soil emissions per stratum
            asl.GHGBSL_soil_i_t = asl.A_i_t * (asl.GHGBSL_soil_CO2_i_t - asl.Deduction_alloch +
                asl.GHGBSL_soil_CH4_i_t + asl.GHGBSL_soil_N2O_i_t);

            // Baseline biomass change calculation
            const monitoring_submergence = getDeltaCBSLAGBiomassForStratumAndYear(
                monitoring_submergence_data, stratum_i, yearRec.year_t);
            asl.delta_C_BSL_biomass_𝑖_t = asl.delta_C_BSL_tree_or_shrub_i_t +
                asl.delta_C_BSL_herb_i_t - monitoring_submergence[0].delta;
        }

        // Year-level aggregations
        const sum_delta_C_BSL_biomass = yearRec.annual_stratum_parameters
            .reduce((acc, s) => acc + (Number(s.annual_stratum_level_parameters
                .delta_C_BSL_biomass_𝑖_t) || 0), 0);

        yearRec.GHG_BSL_biomass = -(sum_delta_C_BSL_biomass * const_44_by_12);
    }
}
```

### Project Emissions Calculation

Project emissions follow a similar pattern but calculate restoration scenario emissions:

```javascript
// Project emissions processing from VM0033
function processProjectEmissions(project, project_soil_CH4, project_soil_CH4_approach,
    GWP_CH4, project_soil_N2O, soil_N2O_approach, GWP_N2O, EF_N2O_Burn, EF_CH4_Burn,
    isPrescribedBurningOfBiomass) {

    for (const yearRec of project.yearly_data_for_project_GHG_emissions ?? []) {
        for (const stratum of yearRec.annual_stratum_parameters ?? []) {
            const asl = stratum.annual_stratum_level_parameters ?? {};
            const sc = stratum.stratum_characteristics ?? {};

            // AR Tool calculations for project scenario
            asl.delta_C_TREE_PROJ_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_TREE;
            asl.delta_C_SHRUB_PROJ_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_SHRUB;
            asl.ET_FC_I_t_ar_tool_5_WPS = stratum.ar_tool_05.ET_FC_y;

            // Project biomass calculations
            asl.delta_C_WPS_tree_or_shrub_i_t = const_12_by_44 *
                (asl.delta_C_TREE_PROJ_i_t_ar_tool_14 + asl.delta_C_SHRUB_PROJ_i_t_ar_tool_14);

            asl.delta_C_WPS_biomass_i_t = asl.delta_C_WPS_tree_or_shrub_i_t + asl.delta_C_WPS_herb_i_t;

            // Project soil emissions
            if (asl.is_soil) {
                const method = sc.co2_emissions_from_soil;

                switch (method) {
                    case "Field-collected data":
                        asl.GHGWPS_soil_CO2_i_t = -(const_44_by_12 * asl.delta_C_WPS_soil_i_t);
                        break;
                    case "Proxies":
                        asl.GHGWPS_soil_CO2_i_t = asl.GHG_emission_proxy_GHGWPS_soil_CO2_i_t;
                        break;
                    default:
                        asl.GHGWPS_soil_CO2_i_t =
                            (asl.GHGWPS_insitu_CO2_i_t ?? 0) +
                            (asl.GHGWPS_eroded_CO2_i_t ?? 0) +
                            (asl.GHGWPS_excav_CO2_i_t ?? 0);
                }
            }

            // Total project soil emissions per stratum
            asl.GHGWPS_soil_i_t = asl.A_i_t * (asl.GHGWPS_soil_CO2_i_t - asl.Deduction_alloch_WPS +
                asl.GHGWPS_soil_CH4_i_t + asl.GHGWPS_soil_N2O_i_t);
        }

        // Year-level project emissions aggregation
        const sum_delta_C_WPS_biomass = yearRec.annual_stratum_parameters.reduce(
            (acc, s) => acc + (Number(s.annual_stratum_level_parameters.delta_C_WPS_biomass_i_t) || 0), 0);

        yearRec.GHG_WPS_biomass = -(sum_delta_C_WPS_biomass * const_44_by_12);
    }
}
```

### Net Emission Reductions Calculation

The net emission reductions calculation combines baseline and project emissions with buffer deductions. Leakage may also be subtracted depending on methodology:

```javascript
// Net emission reductions processing from VM0033
function processNETERR(baseline, project, netErrData, SOC_MAX, emission_reduction_from_stock_loss,
    fire_reduction_premium, FireReductionPremiumArray, NERRWE_Cap, NERRWE_Max, NERError,
    allowable_uncert, buffer_percentage) {

    // Aggregate baseline and project emissions by year
    const perYear = new Map();

    // Process baseline emissions
    for (const yr of baseline.yearly_data_for_baseline_GHG_emissions ?? []) {
        const total = (yr.annual_stratum_parameters ?? []).reduce(
            (a, s) => a + +(s.annual_stratum_level_parameters?.GHGBSL_soil_CO2_i_t ?? 0) *
                     +(s.annual_stratum_level_parameters?.A_i_t ?? 0), 0);

        perYear.set(yr.year_t, {
            year_t: yr.year_t,
            sumation_GHG_BSL_soil_CO2_i_A_i: total,
            sumation_GHG_WPS_soil_CO2_i_A_i: 0
        });
    }

    // Process project emissions
    for (const yr of project.yearly_data_for_project_GHG_emissions ?? []) {
        const total = (yr.annual_stratum_parameters ?? []).reduce(
            (a, s) => a + +(s.annual_stratum_level_parameters?.GHGWPS_soil_CO2_i_t ?? 0) *
                     +(s.annual_stratum_level_parameters?.A_i_t ?? 0), 0);

        if (perYear.has(yr.year_t)) {
            perYear.get(yr.year_t).sumation_GHG_WPS_soil_CO2_i_A_i = total;
        }
    }

    // Calculate annual net emission reductions
    netErrData.net_ERR_calculation_per_year = [...perYear.values()]
        .sort((a, b) => a.year_t - b.year_t)
        .map(rec => {
            // NERRWE calculation (Net Emission Reduction from Wetland Enhancement)
            rec.NERRWE = getGHGBSL(baseline.yearly_data_for_baseline_GHG_emissions, rec.year_t) +
                        getGHGWPS(project.yearly_data_for_project_GHG_emissions, rec.year_t) +
                        rec.FRP - rec.GHG_LK - rec.GHG_WPS_soil_deduction;

            // Apply caps if configured
            if (NERRWE_Cap) {
                rec.NERRWE_capped = rec.NERRWE <= NERRWE_Max ? rec.NERRWE : NERRWE_Max;
                rec.NER_t = rec.NERRWE_capped;
            } else {
                rec.NERRWE_capped = rec.NERRWE;
                rec.NER_t = rec.NERRWE;
            }

            // Apply uncertainty and error adjustments
            rec.adjusted_NER_t = rec.NER_t * (1 - NERError + allowable_uncert);

            return rec;
        });

    // Calculate buffer deductions and final VCUs
    const netErrArr = netErrData.net_ERR_calculation_per_year;

    netErrArr.forEach((rec, idx, arr) => {
        if (idx === 0) {
            rec.buffer_deduction = rec.NER_stock_t * buffer_percentage;
            rec.VCU = rec.adjusted_NER_t - rec.buffer_deduction;
        } else {
            const prevRec = arr[idx - 1];
            rec.buffer_deduction = calculateNetERRChange(
                rec.adjusted_NER_t, prevRec.adjusted_NER_t,
                rec.NER_stock_t, prevRec.NER_stock_t, buffer_percentage);
            rec.VCU = calculateNetVCU(rec.adjusted_NER_t, prevRec.adjusted_NER_t, rec.buffer_deduction);
        }
    });

    // Calculate total VCUs for this instance
    netErrData.total_VCU_per_instance = calculateTotalVCUPerInstance(netErrData);
}
```

## Schema Field Integration

### Auto Calculate Field Pattern

VM0033 uses Auto Calculate type fields to store calculation results that become available to other policy workflow blocks:

```javascript
// Setting Auto Calculate fields in credentialSubject
function processInstance(instance, project_boundary) {
    // ... perform calculations ...

    // Update instance with calculated values
    instance.project_instance.net_ERR.total_VCU_per_instance = totalVCUForInstance;
}

// Main calc function aggregates across instances
function calc() {
    let totalVcus = 0;

    for (const cred of creds) {
        for (const instance of cred.project_data_per_instance) {
            processInstance(instance, cred.project_boundary);
            totalVcus += instance.project_instance.net_ERR.total_VCU_per_instance;
        }
        cred.total_vcus = totalVcus; // Auto Calculate field
    }
}
```

### Field Key Mapping

Calculation code uses field keys from Part III schema development to ensure readability:

```javascript
// Field key mapping examples from VM0033
const monitoringData = {
    // Maps to schema field key: submergence_monitoring_data
    submergenceData: getMonitoringValue(data, 'submergence_monitoring_data'),

    // Maps to schema field key: baseline_soil_carbon_stock_monitoring_data
    baselineSoilData: getMonitoringValue(data, 'baseline_soil_carbon_stock_monitoring_data'),

    // Maps to schema field key: project_herbaceous_vegetation_monitoring_data
    projectVegetationData: getMonitoringValue(data, 'project_herbaceous_vegetation_monitoring_data')
};
```

## Error Handling and Validation

### Input Validation Patterns

VM0033 implements robust input validation to handle missing or invalid data:

```javascript
// Safe number conversion with defaults
const depth_peat_i_t0 = Number(charac.depth_peat_i_t0) || 0;
const VC_I_peat_portion = Number(charac.VC_I_peat_portion) || 0;

// Array validation
for (const yearRec of baseline.yearly_data_for_baseline_GHG_emissions ?? []) {
    for (const stratum of yearRec.annual_stratum_parameters ?? []) {
        // Safe parameter access
        const sc = stratum.stratum_characteristics ?? {};
        const asl = stratum.annual_stratum_level_parameters ?? {};
    }
}

// Division by zero protection
const duration = crediting_period - (sc.soil_type_t0 === 'Peatsoil'
    ? (sc.depth_peat_i_t0 / sc.Ratepeatloss_BSL_i) : 0);

// Calculation with fallback
SDT.t_SDT_BSL_i = soil_disturbance_type === "Erosion" ? 5 :
    (RateCloss_BSL_i !== 0 ? SDT.CBSL_i_t0 / RateCloss_BSL_i : 0);
```

### Calculation Result Validation

The implementation includes validation against expected calculation ranges:

```javascript
// Ensure non-negative values
const C_WPS_i_t100_mineral_soil = Math.max(
    getCBSL_i_t0(temporal_boundary, stratum_i) -
    calculate_non_peat_strata_input_coverage_100_years(
        non_peat_strata_input_coverage_100_years, stratum_i), 0);

// Range checking for percentage calculations
function calculateRemainingPercentage(match, D41) {
    try {
        if (!match || match === 0) throw new Error("Invalid or zero denominator");
        return 100 - (D41 / match);
    } catch {
        return 100; // Safe fallback
    }
}
```

## Testing Calculation Logic

### Unit Testing Approach

Test individual calculation functions using the VM0033 test artifact data:

```javascript
// Example unit test structure for VM0033 calculations
describe('VM0033 Baseline Emissions', () => {
    test('soil CO2 emissions with field-collected data', () => {
        const testInput = {
            is_soil: true,
            co2_emissions_from_soil: "Field-collected data",
            delta_C_BSL_soil_i_t: 100,
            A_i_t: 10
        };

        const result = calculateSoilCO2Emissions(testInput);

        // Validate against test artifact: -(44/12 * 100) * 10 = -3666.67
        expect(result).toBeCloseTo(-3666.67, 2);
    });

    test('net emission reductions calculation', () => {
        const baseline = { GHG_BSL: 1000 };
        const project = { GHG_WPS: -500 };

        const netER = baseline.GHG_BSL + project.GHG_WPS;

        // Expect 1500 tCO2e emission reductions
        expect(netER).toBe(1500);
    });
});
```

### Integration Testing

Test complete calculation workflow with Guardian document structure:

```javascript
// Integration test with Guardian document format
test('complete VM0033 calculation workflow', () => {
    const testDocument = {
        document: {
            credentialSubject: [{
                project_data_per_instance: [{
                    project_instance: {
                        baseline_emissions: { /* test baseline data */ },
                        project_emissions: { /* test project data */ },
                        net_ERR: { /* expected to be populated */ }
                    }
                }],
                project_boundary: { /* test boundary conditions */ },
                individual_parameters: { /* test parameters */ }
            }]
        }
    };

    // Mock Guardian's documents array
    global.documents = [testDocument];

    // Run calculation
    calc();

    // Validate results
    const result = testDocument.document.credentialSubject[0];
    expect(result.total_vcus).toBeGreaterThan(0);
    expect(result.project_data_per_instance[0].project_instance.net_ERR.total_VCU_per_instance)
        .toBeCloseTo(expectedVCUs, 2);
});
```

## Performance Considerations

### Memory Management

For large datasets with multiple monitoring years, manage memory efficiently:

```javascript
// Process data in chunks to avoid memory issues
function processLargeDataset(yearlyData) {
    const CHUNK_SIZE = 100;
    const results = [];

    for (let i = 0; i < yearlyData.length; i += CHUNK_SIZE) {
        const chunk = yearlyData.slice(i, i + CHUNK_SIZE);
        const chunkResults = processDataChunk(chunk);
        results.push(...chunkResults);

        // Clear intermediate variables
        chunk.length = 0;
    }

    return results;
}
```

### Calculation Optimization

Cache frequently accessed values and lookup tables:

```javascript
// Cache conversion constants
const const_12_by_44 = 0.2727272727272727; // 12/44
const const_44_by_12 = 3.6666666666666665; // 44/12

// Cache lookup functions
const memoizedProjectBoundary = new Map();
function getProjectBoundaryValue(data, key) {
    const cacheKey = `${JSON.stringify(data)}_${key}`;
    if (memoizedProjectBoundary.has(cacheKey)) {
        return memoizedProjectBoundary.get(cacheKey);
    }

    const result = data.project_boundary_baseline_scenario?.[key]?.included ??
        data.project_boundary_project_scenario?.[key]?.included ?? undefined;

    memoizedProjectBoundary.set(cacheKey, result);
    return result;
}
```

## Real-World Calculation Results

Using VM0033's calculation engine, the verified carbon unit (VCU) credits are issued over the 40-year crediting period:

| Year | VCU Credits | Year | VCU Credits | Year | VCU Credits | Year | VCU Credits |
|------|-------------|------|-------------|------|-------------|------|-------------|
| 2022 | 0.01 | 2032 | 1,04,012.50 | 2042 | 1,22,680.75 | 2052 | 75,559.80 |
| 2023 | 0.29 | 2033 | 1,10,576.46 | 2043 | 1,20,929.68 | 2053 | 72,200.65 |
| 2024 | 4.31 | 2034 | 1,15,770.40 | 2044 | 1,18,625.12 | 2054 | 69,072.40 |
| 2025 | 1,307.66 | 2035 | 1,19,502.79 | 2045 | 1,15,610.59 | 2055 | 66,174.64 |
| 2026 | 4,126.45 | 2036 | 1,21,779.16 | 2046 | 1,12,059.29 | 2056 | - |
| 2027 | 8,160.33 | 2037 | 1,22,680.75 | 2047 | 1,08,128.98 | 2057 | - |
| 2028 | 12,306.79 | 2038 | 1,22,342.01 | 2048 | 1,03,958.28 | 2058 | - |
| 2029 | 16,287.21 | 2039 | 1,20,929.68 | 2049 | 99,665.22 | 2059 | - |
| 2030 | 24,648.58 | 2040 | 1,18,625.12 | 2050 | 95,347.40 | 2060 | - |
| 2031 | 36,684.89 | 2041 | 1,15,610.59 | 2051 | 91,083.10 | 2061 | - |

**Total VCU Issuance: 28,61,923.07 VCU Credits**

**Key Observations:**
- **Initial Growth (2022-2031)**: VCU issuance grows from 0.01 to 36,685 credits as restoration activities establish
- **Peak Period (2037-2043)**: Maximum annual VCU issuance of ~122,681 credits during full maturity
- **Declining Phase (2044-2055)**: Gradual reduction in annual credits as wetland reaches carbon equilibrium  
- **Total Project Impact**: 28,61,923 VCU credits issued over the complete 40-year crediting period

This demonstrates VM0033's wetland restoration methodology generating substantial carbon credits through increased sequestration from restored vegetation and soil carbon stocks. The calculation results come directly from Guardian's production calculation engine processing the [VM0033 test case data](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx).

## Chapter Summary

This chapter described Guardian's customLogicBlock implementation using VM0033's production calculation code. Key takeaways include:

1. **Document Processing**: Understanding Guardian's credentialSubject structure for accessing monitoring data
2. **Calculation Architecture**: Implementing multi-year, multi-stratum environmental calculations following methodology requirements
3. **Schema Integration**: Using Auto Calculate fields to make calculation results available to policy workflows
4. **Error Handling**: Implementing robust validation for production environmental monitoring data
5. **Performance**: Managing memory and optimization for large temporal datasets

The next chapter explores Formula Linked Definitions (FLDs), and subsequent chapters cover AR Tools implementation patterns and testing frameworks.

---

## Documentation Standards for Remaining Chapters

**Important**: All subsequent chapters in Part V must follow these linking requirements:
- Link to relevant artifacts in [`../../_shared/artifacts/`](../../_shared/artifacts/) folder
- Reference Guardian's [available policy workflow blocks](../../../available-policy-workflow-blocks/) documentation
- Connect to VM0033 production examples from [vm0033-policy.json](../../_shared/artifacts/vm0033-policy.json)
- Include links to [test case artifacts](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx) for validation
- Reference [final PDD VC documents](../../_shared/artifacts/final-PDD-vc.json) for real calculation outputs

*This ensures readers have direct access to all referenced materials and can validate implementations against production examples.*