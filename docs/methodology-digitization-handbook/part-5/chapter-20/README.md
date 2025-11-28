# Chapter 20: Guardian Tools Architecture and Implementation

> Building standardized calculation tools using Guardian's extractDataBlock and customLogicBlock mini-policy pattern

This chapter details how to build Guardian Tools - think of them as mini policies that implement standardized calculation methodologies like CDM AR Tools. Using AR Tool 14 as our example, you'll learn the complete architecture for creating reusable calculation tools that can be integrated into any environmental methodology.

## Learning Objectives

After completing this chapter, you will be able to:

* Understand Guardian's Tools architecture as re-usable mini policies with data extraction and calculation blocks
* Analyze AR Tool 14's production implementation in Guardian format
* Build extractDataBlock workflows for schema input/output operations
* Implement standardized calculation logic using customLogicBlock
* Create modular, reusable tools for integration across multiple methodologies
* Test and validate tool calculations against methodology test artifacts

## Prerequisites

* Completed Chapter 18: Custom Logic Block Development
* Understanding of Guardian workflow blocks from Part IV
* Access to AR Tool 14 artifacts: [AR-Tool-14.json](../../_shared/artifacts/AR-Tool-14.json) and [ar-am-tool-14-v4.1.pdf](../../_shared/artifacts/ar-am-tool-14-v4.1.pdf)
* Familiarity with [extractDataBlock documentation](../../../guardian/standard-registry/policies/policy-creation/introduction/externaldatablock.md)

## What is AR Tool 14?

AR Tool 14 is a **CDM (Clean Development Mechanism) methodological tool** for "Estimation of carbon stocks and change in carbon stocks of trees and shrubs in A/R CDM project activities." It provides standardized methods for:

### Primary Purpose

* **Tree biomass estimation** using allometric equations, sampling plots, or proportionate crown cover
* **Shrub biomass estimation** based on crown cover measurements
* **Carbon stock changes** calculated between two points in time or as annual changes
* **Uncertainty management** with discount factors for conservative estimates

### Key Calculation Methods

From the [AR Tool 14 PDF](../../_shared/artifacts/ar-am-tool-14-v4.1.pdf), the tool supports multiple approaches:

1. **Measurement of sample plots** - Stratified random sampling and double sampling
2. **Modelling approaches** - Tree growth and stand development models
3. **Proportionate crown cover** - For sparse vegetation scenarios
4. **Direct change estimation** - Re-measurement of permanent plots

## Guardian Tools Architecture

![AR Tool 14 within policy editor](<../../../.gitbook/assets/image (90).png>)

### Mini-Policy Pattern

Guardian Tools usually follow a three-block pattern:

```json
{
  "blockType": "tool",
  "tag": "Tool",
  "children": [
    {
      "blockType": "extractDataBlock",
      "action": "get",
      "tag": "get_ar_tool_14"
    },
    {
      "blockType": "customLogicBlock",
      "tag": "calc_ar_tool_14"
    },
    {
      "blockType": "extractDataBlock",
      "action": "set",
      "tag": "set_ar_tool_14"
    }
  ]
}
```

### Block Flow Architecture

The Tool workflow follows this pattern:

1. **Input Event** → `get_ar_tool_14` (extractDataBlock)
2. **Data Processing** → `calc_ar_tool_14` (customLogicBlock)
3. **Output Event** → `set_ar_tool_14` (extractDataBlock)

## extractDataBlock: Data Input/Output Engine

### Understanding extractDataBlock

The extractDataBlock is Guardian's mechanism for working with embedded schema data. From the [documentation](../../../guardian/standard-registry/policies/policy-creation/introduction/externaldatablock.md):

> "This block is used for VC documents which are based on (or 'conform to') a schema which contains embedded schemas, extractDataBlock provides means to extract a data set which corresponds to any of these embedded schemas (at any depth level), and if required after processing to return the updated values back into the VC dataset to their original 'place'."

### AR Tool 14 Schema Integration

In our AR Tool 14 implementation, the extractDataBlock references schema `#632fd070-d788-49ae-889b-cd281c6c7194&1.0.0` which is published version of Tool 14 schema. You can see schema excel within [PDD-schema.xlsx](../../_shared/artifacts/PDD-schema.xlsx):

```json
{
  "blockType": "extractDataBlock",
  "action": "get",
  "schema": "#632fd070-d788-49ae-889b-cd281c6c7194&1.0.0",
  "tag": "get_ar_tool_14"
}
```

This extracts the AR Tool 14 input data structure from the parent document, containing parameters like:

* **Tree measurements** - DBH, height, species data
* **Plot information** - Area, sampling design, stratum details
* **Calculation methods** - Selected approaches for biomass estimation
* **Uncertainty parameters** - Confidence levels and discount factors

### Data Extraction Process

When a policy workflow calls the AR Tool 14, the extraction process works as follows:

```javascript
// Conceptual flow - Guardian handles this automatically
const parentDocument = {
  document: {
    credentialSubject: [
      {
        // Parent methodology data
        project_details: {...},

        // Embedded AR Tool 14 schema data
        ar_tool_14_inputs: {
          scenario_type: "Project scenario",
          method_for_change_in_cs_in_trees: "Between two points of time",
          cs_in_trees_at_point_of_time: {
            method_used_for_estimating_cs_in_trees_at_a_point_of_time: "Measurement of sample plots",
            measurement_of_sample_plots: {
              sampling_design: "Stratified random sampling",
              stratified_random_sampling: {
                stratified_random_sampling_variables: [...]
              }
            }
          }
        }
      }
    ]
  }
};

// extractDataBlock extracts just the ar_tool_14_inputs portion
```

## customLogicBlock: AR Tool 14 Calculation Engine

### Production JavaScript Implementation

The AR Tool 14 customLogicBlock contains the actual calculation engine. From our [AR-Tool-14.json](../../_shared/artifacts/AR-Tool-14.json) artifact, here's the implementation structure:

```javascript
// Core calculation function from AR Tool 14 production code
function calc_ar_tool_14(document) {
    let delta_C_SHRUB = 0;
    let C_SHRUB_t = 0;
    let delta_C_TREE = 0;
    let C_TREE = 0;

    const method_for_change_in_cs_in_trees = document.method_for_change_in_cs_in_trees;
    const scenario_type = document.scenario_type;

    // Tree carbon stock change calculations
    if (method_for_change_in_cs_in_trees === 'Between two points of time') {
        const change_in_cs_in_trees_btw_two_points_of_time =
            document.change_in_cs_in_trees_btw_two_points_of_time;

        const method_selection = change_in_cs_in_trees_btw_two_points_of_time
            .method_selection_cs_in_trees_bwt_two_points_of_time;

        if (method_selection === 'Difference of two independent stock estimations') {
            delta_C_TREE = calc_difference_of_two_independent_stock(
                change_in_cs_in_trees_btw_two_points_of_time.difference_of_two_independent_stock,
                scenario_type
            );
        } else if (method_selection === 'Direct estimation of change by re-measurement of sample plots') {
            delta_C_TREE = calc_direct_estimation_change_via_sample_plot(
                change_in_cs_in_trees_btw_two_points_of_time.direct_estimation_change_via_sample_plot,
                scenario_type
            );
        }
    }

    // Tree carbon stock at point in time calculations
    const cs_in_trees_at_point_of_time = document.cs_in_trees_at_point_of_time;
    const method_used = cs_in_trees_at_point_of_time.method_used_for_estimating_cs_in_trees_at_a_point_of_time;

    if (method_used === "Measurement of sample plots") {
        const measurement_of_sample_plots = cs_in_trees_at_point_of_time.measurement_of_sample_plots;

        if (measurement_of_sample_plots.sampling_design === "Stratified random sampling") {
            C_TREE = calc_stratified_random_sampling(
                measurement_of_sample_plots.stratified_random_sampling,
                scenario_type
            );
        } else {
            C_TREE = calc_double_sampling(
                measurement_of_sample_plots.double_sampling,
                scenario_type
            );
        }
    }

    return Object.assign(document, {
        delta_C_SHRUB: delta_C_SHRUB,
        C_SHRUB_t: C_SHRUB_t,
        delta_C_TREE: delta_C_TREE,
        C_TREE: C_TREE
    });
}
```

### Stratified Random Sampling Implementation

Code for stratified random sampling from AR Tool 14:

```javascript
// Real implementation from AR Tool 14 production code
function calc_stratified_random_sampling(document, scenario) {
    let discount = 0;
    const stratified_random_sampling_variables = document.stratified_random_sampling_variables;

    // Calculate mean biomass per stratum
    stratified_random_sampling_variables.forEach((variable) => {
        const sum = variable.b_TREE_p_i.reduce(
            (accumulator, currentValue) => accumulator + currentValue, 0
        );
        const total_sample_plot = variable.b_TREE_p_i.length;
        variable.b_TREE_i = sum / total_sample_plot;

        // Calculate variance
        const sumOfSquares = variable.b_TREE_p_i.reduce(
            (accumulator, currentValue) => accumulator + Math.pow(currentValue, 2), 0
        );
        const numerator = total_sample_plot * sumOfSquares - Math.pow(sum, 2);
        const denominator = total_sample_plot * (total_sample_plot - 1);
        variable.S_2_i = numerator / denominator;
    });

    // Weighted mean calculation
    const w_i_array = stratified_random_sampling_variables.map(variable => variable.w_i);
    const b_TREE_i_array = stratified_random_sampling_variables.map(variable => variable.b_TREE_i);
    document.b_TREE = sumProduct(w_i_array, b_TREE_i_array);

    // Uncertainty calculation
    const S_2_i_array = stratified_random_sampling_variables.map(variable => variable.S_2_i / variable.b_TREE_p_i.length);
    const w_2_i_array = w_i_array.map(variable => Math.pow(variable, 2));
    const summationForUncertainty = sumProduct(w_2_i_array, S_2_i_array);
    const sqrtSummation = Math.sqrt(summationForUncertainty);

    document.u_c = safeDivide(document.t_VAL * sqrtSummation, document.b_TREE);
    document.B_TREE = document.A * document.b_TREE;

    // Convert to carbon
    let C_tree = (44 / 12) * document.CF_TREE * document.B_TREE;
    const relative_uncertainty = safeDivide(document.u_c, C_tree) * 100;

    // Apply uncertainty discount
    const applied_discount = getDiscount(relative_uncertainty);
    if (applied_discount !== null) {
        discount = (applied_discount * document.u_c) / 100;
    }

    return scenario === 'Project scenario' ? C_tree - discount : C_tree + discount;
}
```

### Uncertainty Management System

AR Tool 14 also implements a sophisticated uncertainty discount system:

```javascript
// Uncertainty discount system from production code
function getDiscount(uncertainty) {
    if (uncertainty <= 10) {
        return 0; // 0% discount
    } else if (uncertainty > 10 && uncertainty <= 15) {
        return 25; // 25% discount
    } else if (uncertainty > 15 && uncertainty <= 20) {
        return 50; // 50% discount
    } else if (uncertainty > 20 && uncertainty <= 30) {
        return 75; // 75% discount
    } else if (uncertainty > 30) {
        return 100; // 100% discount - conservative estimate
    } else {
        return null; // Invalid uncertainty value
    }
}
```

## Building Your Own Tool

### Step 1: Define Tool Schema

First, create a schema that captures all the input parameters for your calculation methodology:

```json
{
  "type": "object",
  "properties": {
    "scenario_type": {
      "type": "string",
      "enum": ["Baseline scenario", "Project scenario"]
    },
    "method_for_change_in_cs_in_trees": {
      "type": "string",
      "enum": ["Between two points of time", "In a year"]
    },
    "cs_in_trees_at_point_of_time": {
      "type": "object",
      "properties": {
        "method_used_for_estimating_cs_in_trees_at_a_point_of_time": {
          "type": "string",
          "enum": ["Measurement of sample plots", "Proportionate crown cover"]
        }
      }
    }
  }
}
```

### Step 2: Implement Tool Policy Structure

Create the three-block tool structure:

```json
{
  "name": "Tool Name",
  "description": "Tool description from methodology PDF",
  "config": {
    "blockType": "tool",
    "tag": "Tool",
    "children": [
      {
        "id": "extract-input",
        "blockType": "extractDataBlock",
        "action": "get",
        "schema": "#your-schema-id&1.0.0",
        "tag": "get_your_tool"
      },
      {
        "id": "calculate",
        "blockType": "customLogicBlock",
        "tag": "calc_your_tool",
        "expression": "function calc() { /* Your calculation code */ }"
      },
      {
        "id": "extract-output",
        "blockType": "extractDataBlock",
        "action": "set",
        "schema": "#your-schema-id&1.0.0",
        "tag": "set_your_tool"
      }
    ],
    "events": [
      {
        "target": "get_your_tool",
        "source": "Tool",
        "input": "RunEvent",
        "output": "input_event"
      }
    ]
  }
}
```

### Step 3: Implement Calculation Logic

Build your customLogicBlock calculation function following the Guardian pattern:

```javascript
function calc_your_tool() {
    const documents = arguments[0] || [];

    return documents.map((document) => {
        const inputData = document.document.credentialSubject[0];

        // Your methodology calculations here
        const results = performCalculations(inputData);

        // Return modified document with results
        return Object.assign(inputData, results);
    });
}

function performCalculations(data) {
    // Implement your specific methodology equations
    // Follow patterns from AR Tool 14 for structure

    return {
        calculated_parameter_1: result1,
        calculated_parameter_2: result2,
        uncertainty_assessment: uncertaintyResults
    };
}
```

## Tool Integration in Parent Policies

### Calling Tools from Methodologies

Guardian Tools are designed to be called from parent methodology policies. Here's how VM0033 would integrate AR Tool 14:

![Tool integration in new project submission flow](<../../../.gitbook/assets/image-1 (8).png>)

### Tool Event Configuration

Tools communicate with parent policies through Guardian's event system:

```json
{
  "events": [
    {
      "target": "get_ar_tool_14",
      "source": "Tool",
      "input": "RunEvent",
      "output": "input_ar_tool_14"
    },
    {
      "target": "Tool",
      "source": "set_ar_tool_14",
      "input": "output_ar_tool_14",
      "output": "RunEvent"
    }
  ]
}
```

## Testing and Validation Framework

### Unit Testing Tool Calculations

Test individual calculation functions against methodology test cases:

```javascript
// Test framework for AR Tool 14 calculations
function testARTool14StratifiedSampling() {
    const testInput = {
        scenario_type: "Project scenario",
        stratified_random_sampling_variables: [
            {
                w_i: 0.3,
                b_TREE_p_i: [45.2, 52.1, 38.7, 41.3],
                stratum_area: 100
            },
            {
                w_i: 0.7,
                b_TREE_p_i: [62.4, 58.9, 67.2, 55.8],
                stratum_area: 200
            }
        ],
        CF_TREE: 0.47,
        A: 300,
        t_VAL: 1.96
    };

    const result = calc_stratified_random_sampling(testInput, "Project scenario");
    const expectedResult = 156.7; // From test artifact
    const tolerance = 0.05; // 5% tolerance

    const difference = Math.abs(result - expectedResult) / expectedResult;

    return {
        passed: difference <= tolerance,
        calculated: result,
        expected: expectedResult,
        difference_percent: difference * 100
    };
}
```

## Best Practices for Guardian Tools

### Design Principles

1. **Single Responsibility**: Each tool should implement exactly one methodology or calculation standard
2. **Schema Clarity**: Design clear, well-documented input/output schemas
3. **Modular Architecture**: Break complex calculations into testable functions
4. **Error Resilience**: Handle edge cases and invalid inputs gracefully
5. **Performance**: Optimize for large dataset processing
6. **Validation**: Include comprehensive uncertainty and validation logic

## Chapter Summary

Guardian Tools provide a powerful architecture for implementing standardized calculation methodologies as reusable mini policies. Key concepts:

* **Tools are like mini policies** that follow the extractDataBlock → customLogicBlock → extractDataBlock pattern
* **AR Tool 14 demonstrates** complete implementation of complex biomass calculations with uncertainty management
* **extractDataBlock handles** schema-based data input and output operations automatically
* **customLogicBlock contains** the actual methodology calculation logic in JavaScript
* **Production examples** from AR Tool 14 show real implementation patterns for stratified sampling, uncertainty discounts, and error handling
* **Integration patterns** enable tools to be called from parent methodology policies
* **Testing frameworks** ensure calculation accuracy against methodology test artifacts

### Next Steps

Chapter 21 will demonstrate comprehensive testing and validation frameworks for custom logic blocks for individual tools and complete policy.

## References and Further Reading

* [AR Tool 14 Guardian Implementation](../../_shared/artifacts/AR-Tool-14.json) - Complete tool policy configuration
* [AR Tool 14 PDF Methodology](../../_shared/artifacts/ar-am-tool-14-v4.1.pdf) - Original CDM methodology document
* [Guardian extractDataBlock Documentation](../../../guardian/standard-registry/policies/policy-creation/introduction/externaldatablock.md)
* [Guardian customLogicBlock Documentation](../../../available-policy-workflow-blocks/customlogicblock.md)

***

{% hint style="success" %}
**Tool Building Success**: You now understand how to build complete Guardian Tools using the extractDataBlock and customLogicBlock pattern. The AR Tool 14 example provides a production-ready template for implementing any standardized calculation methodology in Guardian.
{% endhint %}
