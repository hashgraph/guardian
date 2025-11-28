# Chapter 10: Monitoring Report Schema Development

This chapter teaches you how to build monitoring report schemas that handle time-series data collection and calculation updates. You'll learn the exact field-by-field process used for VM0033's monitoring schema, building on the PDD foundation from Chapter 9.

By the end of this chapter, you'll know how to create the [VM0033 Monitoring schema](../../_shared/artifacts/Monitoring-schema.xlsx) structure yourself, understanding temporal data management, annual parameter tracking, and calculation update mechanisms.

## Monitoring Schema Purpose and Structure

Monitoring schemas extend your PDD implementation to handle ongoing project operations over crediting periods. Unlike PDD schemas that capture initial project design, monitoring schemas handle:

* **Annual Data Collection**: Time-series parameter measurements across project lifetime
* **Calculation Updates**: Dynamic recalculation of emission reductions based on new monitoring data
* **Quality Control**: Data validation and evidence documentation for verification activities
* **Temporal Relationships**: Maintaining connections between annual data and cumulative results

Usually, there's always a section on methodology PDF(including VM0033) on data and parameters to be monitored. Typcially, those fields are submitted as part of Monitoring report.

![Subsection of Herbaceous Vegetation Stratum Data for Project in MR schema](<../../../.gitbook/assets/image (38).png>)

## Building the Primary Monitoring Schema

### Step 1: Create Main Monitoring Schema Header

Start your monitoring Excel file with the main schema structure:

```excel
Row 1: Monitoring Report (Auto)
Row 2: Description | Monitoring period input parameters for measuring carbon stock changes and GHG emissions
Row 3: Schema Type | Verifiable Credentials
Row 4: Required Field | Field Type | Parameter | Visibility | Question | Allow Multiple Answers | Answer
```

This establishes the monitoring schema as a Verifiable Credentials type that will create on-chain records for each monitoring submission.

### Step 2: Add Temporal Framework Fields

The first fields should establish the temporal context for monitoring data:

```excel
Row 5: Yes | Number | | | Monitoring year | No | 7
Row 6: Yes | Number | | | Monitoring period (years since project start) | No | 1
Row 7: Yes | Date | | | Monitoring report submission date | No | 2000-01-01
Row 8: Yes | String | | | Monitoring period identifier | No | MP-2024-01
```

These fields establish when the monitoring data was collected and create unique identifiers for each monitoring period.

### Step 3: Add Monitoring Period Input Structure

Create the main monitoring data collection framework:

```excel
Row 9: Yes | (New) Monitoring Period Inputs | | | Monitoring Period Inputs | No |
```

This references a sub-schema containing the detailed monitoring parameter collection fields.

### Step 4: Create Monitoring Period Inputs Sub-Schema

Create a new worksheet "(New) Monitoring Period Inputs" with the monitoring parameter structure:

```excel
(New) Monitoring Period Inputs
Description | Monitoring period input parameters for measuring carbon stock changes and GHG emissions
Schema Type | Verifiable Credentials
Required Field | Field Type | Parameter | Visibility | Question | Allow Multiple Answers | Answer
Yes | Boolean | | | Baseline Aboveground non-tree biomass | No | True
No | (New) MP Baseline Herbaceous V | | | Baseline herbaceous vegetation monitoring data | Yes |
Yes | Number | | | Monitoring year | No | 7
Yes | (New) MP Herbaceous Vegetat 1 | | | Measurements for each stratum | Yes |
```

![Monitoring Period Inputs Sheet](<../../../.gitbook/assets/image-1 (2).png>)

## Implementing Stratum-Level Data Collection

### Creating Stratum Monitoring Sub-Schemas

For methodologies with multiple strata like VM0033, create stratum-specific monitoring:

Create "(New) MP Herbaceous Vegetat 1" worksheet(names are trimmed to accomodate excel's limitations):

```excel
(New) MP Herbaceous Vegetation Stratum Data for Project
Description | Stratum-level herbaceous vegetation monitoring
Schema Type | Sub-Schema
Required Field | Field Type | Parameter | Visibility | Question | Allow Multiple Answers | Answer
Yes | String | | | Stratum number | No | 1
Yes | Number | | | Carbon stock in herbaceous vegetation (t C/ha) - CBSL-herb,i,t | No | 1.5
Yes | Number | | | Initial time T for measurement - Start_T (BSL) | No | True
Yes | Number | | | Carbon stock at time T - CBSL-herb,i,(t-T) | No | 0.5
```

### Adding Change Detection Fields

Monitor changes from baseline or previous periods:

```excel
Yes | Number | | | Change in carbon stock since last period | No | 0.2
Yes | String | | | Explanation for significant changes | No | example
Yes | Boolean | | | Data quality meets methodology requirements | No | True
```

## Annual Parameter Tracking Implementation

### Step 1: Create Annual Input Parameters Structure

Add annual parameter collection capability:

```excel
Yes | (New) Annual Inputs Parameters | | | Annual Inputs Parameters Baseline | No |
```

### Step 2: Build Annual Inputs Sub-Schema

Create "(New) Annual Inputs Parameters" worksheet:

```excel
(New) Annual Inputs Parameters Baseline
Description | Annual input parameters for baseline calculations
Schema Type | Sub-Schema
Required Field | Field Type | Parameter | Visibility | Question | Allow Multiple Answers | Answer
Yes | Number | | | Area of stratum (ha) – Ai,t | No | 1
Yes | Number | | | Change in baseline tree-biomass carbon stock (t CO₂-e yr⁻¹) – ΔCTREE_BSL,i,t | No | 1
Yes | Number | | | CO₂ emissions from in-situ soil (t CO₂e ha⁻¹ yr⁻¹) – GHGBSL-insitu-CO₂,i,t | No | 1
Yes | Number | | | Percentage of organic carbon loss from in-situ soil (%) – C%BSL-emitted,i,t | No | 1
```

### Step 3: Add Project Scenario Annual Parameters

Create corresponding project emissions tracking:

```excel
Yes | (New) Annual Inputs Paramet 1 | | | Annual Inputs Parameters Project | No |
```

Create "(New) Annual Inputs Paramet 1" worksheet with project-specific parameters:

```excel
(New) Annual Inputs Parameters Baseline
Description | Annual input parameters for project calculations
Schema Type | Sub-Schema
Required Field | Field Type | Parameter | Visibility | Question | Allow Multiple Answers | Answer
Yes | Number | | | Area of stratum (ha) – Ai,t | No | 1
Yes | Number | | | Change in project tree-biomass carbon stock (t CO₂-e yr⁻¹) – ΔCTREE_WPS,i,t | No | 1
Yes | Number | | | CO₂ emissions from project soil (t CO₂e ha⁻¹ yr⁻¹) – GHGWPS-insitu-CO₂,i,t | No | 1
Yes | Number | | | Percentage of organic carbon in project soil (%) – C%WPS-soil,i,t | No | 1
```

## Implementing Quality Control and Evidence Collection

### Adding Data Quality Indicators

Include quality control fields in your monitoring schemas:

```excel
Yes | Enum | Data quality level (enum) | | Data quality level for this measurement | No | High
Yes | String | | | Quality control procedures followed | No | example
Yes | Image | | | Site photograph for verification | No | ipfs://05566a658a44c6f747b5f82a2de1e0bf
Yes | String | | | GPS coordinates of measurement location | No | example
```

Create "Data quality level (enum)" tab:

```excel
Schema name | Monitoring Report (Auto)
Field name | Data quality level for this measurement
Loaded to IPFS | No
High |
Medium |
Low |
```

### Evidence Documentation Structure

Add fields for verification evidence:

```excel
Yes | String | | | Measurement methodology used | No | example
Yes | Date | | | Date of field measurement | No | 2000-01-01
Yes | String | | | Personnel responsible for measurement | No | example
No | String | | | Laboratory analysis results | No | example
No | Image | | | Laboratory report scan | No | ipfs://05566a658a44c6f747b5f82a2de1e0bf
```

## Calculation Update Mechanisms

### Adding Calculation Fields

Include fields that trigger calculation updates:

```excel
No | Auto-Calculate | | | Updated baseline emissions (t CO2e) | No | 150.5
No | Auto-Calculate | | | Updated project emissions (t CO2e) | No | 45.2
No | Auto-Calculate | | | Net emission reductions this period (t CO2e) | No | 105.3
No | Auto-Calculate | | | Cumulative emission reductions (t CO2e) | No | 850.7
```

### Linking to PDD Parameters

Ensure monitoring parameters connect to PDD estimates:

```excel
Yes | Number | | | Initial PDD estimate for comparison | No | 1
Yes | Number | | | Variance from PDD estimate (%) | No | 5.2
Yes | String | | | Explanation for variance | No | example
```

## Temporal Boundary Management

### Crediting Period Tracking

Add fields to manage crediting periods:

```excel
Yes | Enum | Crediting period (enum) | | Crediting period | No | 1st period (0-10 years)
Yes | Number | | | Year within current crediting period | No | 3
Yes | Boolean | | | Final monitoring report for this period | No | False
```

Create "Crediting period (enum)" tab:

```excel
Schema name | Monitoring Report (Auto)
Field name | Crediting period
Loaded to IPFS | No
1st period (0-10 years) |
2nd period (10-20 years) |
3rd period (20-30 years) |
[continue as needed for methodology requirements]
```

### Historical Data References

Enable access to previous monitoring data:

```excel
No | String | | Hidden | Previous monitoring report ID | No | example
No | Number | | | Change since previous monitoring period | No | 2.5
Yes | Boolean | | | Significant changes requiring explanation | No | False
```

## VVB Verification Support Fields

### Adding Verification Workflow Fields

Include fields supporting VVB verification activities:

```excel
Yes | String | | | VVB assigned for verification | No | example
No | Date | | | VVB site visit date | No | 2000-01-01
No | Enum | Verification status (enum) | | Verification status | No | Under review
No | String | | | VVB comments | No | example
No | Boolean | | | Verification approved | No | False
```

Create "Verification status (enum)" tab:

```excel
Schema name | Monitoring Report (Auto)
Field name | Verification status
Loaded to IPFS | No
Under review |
Approved |
Requires revision |
Rejected |
```

### Audit Trail Fields

Maintain audit trail for verification:

```excel
No | String | | Hidden | Monitoring report version | No | v1.0
No | Date | | Hidden | Last modification date | No | 2000-01-01
No | String | | Hidden | Modification log | No | example
```

## Advanced Monitoring Features

### Conditional Monitoring Based on PDD Selections

Link monitoring requirements to PDD method selections:

```excel
No | Number | | FALSE | Direct measurement biomass (if direct method selected) | No | 1
No | Number | | FALSE | Indirect calculation biomass (if indirect method selected) | No | 1
```

### Multi-Year Averaging Fields

For parameters requiring multi-year tracking:

```excel
Yes | Number | | | 3-year average carbon stock | No | 12.5
Yes | Number | | | 5-year trend in carbon accumulation | No | 0.8
Yes | String | | | Trend analysis explanation | No | example
```

### Uncertainty Quantification

Add uncertainty tracking as required by methodology:

```excel
Yes | Number | | | Measurement uncertainty (%) | No | 5.0
Yes | String | | | Uncertainty calculation method | No | example
Yes | Number | | | Confidence interval lower bound | No | 10.2
Yes | Number | | | Confidence interval upper bound | No | 14.8
```

## Performance Optimization for Long-term Monitoring

### Efficient Data Structure Design

Use sub-schemas to group related annual data:

```excel
Yes | (New) Project Emissions Annual | | | Project Emissions Annual Data | No |
```

Create efficient annual data structure in "(New) Project Emissions Annual":

```excel
(New) Project Emissions Annual
Description | Annual project emissions data
Schema Type | Sub-Schema
Required Field | Field Type | Parameter | Visibility | Question | Allow Multiple Answers | Answer
Yes | Number | | | Year | No | 2024
Yes | String | | | Data collector | No | example
[Include only essential annual fields to maintain performance]
```

### Archive and Retrieval Planning

Include fields supporting long-term data management:

```excel
No | String | | Hidden | Archive status | No | Active
No | Date | | Hidden | Archive date | No | 2000-01-01
No | Boolean | | Hidden | Available for new calculations | No | True
```

## Testing Your Monitoring Schema

Guardian provides built-in validation when importing Excel schemas and testing schema functionality through the UI.

### Validation Checklist for Monitoring Schemas

Before deploying, verify:

* [ ] Temporal fields properly identify monitoring periods
* [ ] Parameter names match PDD schema conventions
* [ ] Calculation fields properly reference annual data
* [ ] Quality control fields support verification requirements
* [ ] Evidence fields accept appropriate file types
* [ ] Sub-schemas properly handle stratum-level data
* [ ] Conditional logic aligns with PDD method selections

#### Important: Field Key Management for Monitoring Schemas

Just like PDD schemas, Guardian generates default field keys when importing monitoring Excel schemas. This is especially important for monitoring schemas since they often have time-series calculations.

**After Import - Review and Rename Field Keys**:

1. Navigate to schema management in Guardian
2. Open your imported monitoring schema for editing
3. Review each field's "Field Key" property
4. Rename keys for calculation-friendly monitoring code:
   * `monitoring_year_t` instead of `G5`
   * `carbon_stock_current_period` instead of `carbonStockCurrentPeriod`
   * `emission_reduction_annual` instead of `emissionReductionAnnual`
   * `biomass_change_since_baseline` instead of `biomassChangeSinceBaseline`

**Why This Matters for Monitoring**: Time-series calculations rely heavily on clear field naming:

```javascript
// With good field keys - monitoring calculation
const annualChange = data.carbon_stock_current_period - data.carbon_stock_previous_period;
const cumulativeER = data.emission_reduction_total + annualChange;

// With default keys - confusing for time-series
const annualChange = data.field5 - data.field12;
const cumulativeER = data.field8 + annualChange;
```

### Integration Testing with PDD Schema

1. **Test parameter name consistency** between PDD and monitoring field keys
2. Validate calculation updates when monitoring data changes
3. Verify temporal relationship tracking works correctly
4. Test VVB verification workflow with monitoring submissions
5. Validate cumulative calculation accuracy over multiple periods

### Trigger Automatic Calculations

* Monitoring data submission triggers emission reduction calculations
* Updated results flow to token minting calculations
* Quality control validation occurs before calculation updates

### Support Verification Processes

* VVB receives monitoring data with evidence documentation
* Verification decisions update project status and calculation eligibility
* Approved monitoring data enables token issuance for the monitoring period

## Best Practices for Monitoring Schema Development

**Parameter Consistency**: Ensure monitoring parameter names and units exactly match PDD schema definitions to enable proper calculation updates.

**Quality Control Integration**: Include quality indicators and evidence fields for every critical measurement to support verification workflows.

**Performance Planning**: It's important to design efficient sub-schema structures that maintain performance as historical monitoring data accumulates over project lifetimes.

**Temporal Logic**: Plan temporal relationships carefully to support both period-specific and cumulative calculations across crediting periods.

**Evidence Management**: Include appropriate file upload and documentation fields to support verification requirements and audit trail maintenance.

**VVB Workflow Design**: Design verification support fields that enable efficient VVB review and approval processes without overwhelming interfaces.
