# 🗂️ Artifacts Collection

> Comprehensive collection of test artifacts, calculation implementations, Guardian tools, and reference materials for methodology digitization

## Overview

This directory contains essential artifacts used throughout the methodology digitization process, including real test data, production implementations, Guardian tools, and validation materials. All artifacts have been tested and validated for accuracy against their respective environmental methodologies.

## VM0033 Reference Materials

### [VM0033-Methodology.md](VM0033-Methodology.md)

Complete parsed and structured version of the VM0033 methodology document:

* Structured methodology text with proper formatting
* All equations and calculation formulas
* Parameter definitions and requirements
* Tools and modules documentation
* Methodology-specific guidance

### [VM0033-Methodology\_meta.json](VM0033-Methodology_meta.json)

Metadata and structural information for the VM0033 methodology:

* Document structure and sections
* Equation references and locations
* Parameter cross-references
* Validation checkpoints

### [vm0033-policy.json](vm0033-policy.json)

Complete Guardian policy implementation for VM0033:

* Production-ready policy configuration
* All workflow blocks and schema references
* Role-based access controls and permissions
* Complete integration with Guardian platform

## Test Data & Validation Artifacts

### [VM0033\_Allcot\_Test\_Case\_Artifact.xlsx](VM0033_Allcot_Test_Case_Artifact.xlsx)

Official test case artifact developed with Verra using real Allcot ABC Mangrove project data:

* Actual project parameters from implemented restoration activities
* Real-world baseline emissions calculations
* Documented project emissions calculations
* Leakage calculations based on actual project conditions
* Final emission reduction results for validation
* Comprehensive test scenarios covering different wetland types and restoration activities

### [ER\_calculations\_ABC Senegal.xlsx](ER_calculations_ABC%20Senegal.xlsx)

Real-world emission reduction calculations for ABC Senegal project:

* Practical application of methodology calculations
* Project-specific parameter values
* Verification data points

### [final-PDD-vc.json](final-PDD-vc.json)

Complete Guardian Verifiable Credential containing VM0033 test data:

* **Purpose**: Production Guardian VC format with complete VM0033 test case data
* **Contents**: Baseline emissions, project emissions, leakage calculations, and net ERR
* **Usage**: Testing Guardian policy calculations and validating customLogicBlock implementations
* **Size**: 3.6MB with comprehensive test data structure
* **Integration**: Direct input for Guardian dry-run mode and customLogicBlock testing

### [PDD-VC-input.json](PDD-VC-input.json)

Guardian VC input document for PDD submission testing:

* **Purpose**: Template for Project Design Document submissions in Guardian
* **Contents**: Complete PDD structure with VM0033 test data
* **Usage**: Testing PDD submission workflows and schema validation
* **Integration**: Compatible with Guardian requestVcDocumentBlock testing

## Guardian Tools & Implementation Code

### [AR-Tool-14.json](AR-Tool-14.json)

Complete Guardian Tool implementation for AR Tool 14 (CDM biomass calculations):

* **Purpose**: Production Guardian Tool for tree and shrub biomass estimation
* **Architecture**: Three-block pattern (extractDataBlock → customLogicBlock → extractDataBlock)
* **Calculations**: Stratified random sampling, uncertainty management, discount factors
* **Integration**: Mini-policy that can be called from parent methodologies like VM0033
* **Testing**: Includes production JavaScript for all calculation scenarios

### [ar-am-tool-14-v4.1.pdf](ar-am-tool-14-v4.1.pdf)

Official CDM AR Tool 14 methodology document (32 pages):

* **Purpose**: Original methodology specification for AR Tool 14 implementation
* **Contents**: Complete methodology for biomass and carbon stock estimation
* **Usage**: Reference document for understanding Guardian Tool implementation
* **Key Topics**: Sampling methods, allometric equations, uncertainty assessment

### [er-calculations.js](er-calculations.js)

Production JavaScript implementation of VM0033 emission reduction calculations:

* **Purpose**: Real Guardian customLogicBlock code for VM0033 calculations
* **Contents**: Baseline emissions, project emissions, leakage, and net ERR functions
* **Usage**: Reference implementation for Guardian policy development
* **Testing**: Validated against VM0033 test artifacts
* **Integration**: Direct copy-paste into Guardian customLogicBlock

## Guardian Schema Templates

### [PDD-schema.xlsx](PDD-schema.xlsx)

Project Design Document schema template for VM0033:

* **Purpose**: Excel-first approach to Guardian schema development
* **Contents**: Complete PDD structure with field types and validation rules
* **Usage**: Import directly into Guardian for schema creation
* **Features**: Guardian-compatible formatting, field key management

### [Monitoring-schema.xlsx](Monitoring-schema.xlsx)

Monitoring Report schema template for VM0033:

* **Purpose**: Time-series monitoring data schema for Guardian
* **Contents**: Annual monitoring parameters with temporal data structures
* **Usage**: Schema development for monitoring report submissions
* **Features**: VVB verification workflow support, time-series calculations

### [schema-template-excel.xlsx](schema-template-excel.xlsx)

Standard Excel template for creating Guardian schemas:

* **Purpose**: Base template for any Guardian schema development
* **Contents**: Pre-configured field types and validation rules
* **Usage**: Starting point for custom schema creation
* **Features**: Guardian-compatible structure, import-ready format

## Development Tools

### [excel\_artifact\_extractor.py](excel_artifact_extractor.py)

Python tool for extracting and validating calculation data from Excel artifacts:

* **Purpose**: Automated parameter extraction and validation
* **Features**: Calculation validation, schema generation support, quality assurance checks

```python
# Usage examples
python excel_artifact_extractor.py list-workbooks
python excel_artifact_extractor.py extract-tabs VM0033_Allcot_Test_Case_Artifact.xlsx
python excel_artifact_extractor.py extract-tab-content VM0033_Allcot_Test_Case_Artifact.xlsx "8.5NetERR"
```

## Artifact Categories & Usage

### 📊 For Testing & Validation

* Use `VM0033_Allcot_Test_Case_Artifact.xlsx` for official test case validation
* Use `final-PDD-vc.json` for Guardian customLogicBlock testing
* Use `ER_calculations_ABC Senegal.xlsx` for real-world validation scenarios

### 🛠️ For Implementation

* Use `er-calculations.js` as reference for customLogicBlock development
* Use `AR-Tool-14.json` as template for Guardian Tools development
* Use `vm0033-policy.json` for complete Guardian policy reference

### 📋 For Schema Development

* Start with `schema-template-excel.xlsx` for any new schema
* Use `PDD-schema.xlsx` and `Monitoring-schema.xlsx` for VM0033-specific schemas
* Follow Excel-first approach documented in Part III

### 🔍 For Documentation & Reference

* Reference `VM0033-Methodology.md` for methodology understanding
* Use `ar-am-tool-14-v4.1.pdf` for AR Tool implementation guidance
* Check `VM0033-Methodology_meta.json` for structural metadata

## Guardian Testing Integration

### CustomLogicBlock Testing

```json
{
  "test_input_file": "final-PDD-vc.json",
  "validation_reference": "VM0033_Allcot_Test_Case_Artifact.xlsx",
  "implementation_code": "er-calculations.js"
}
```

### Dry-Run Mode Testing

```json
{
  "policy_file": "vm0033-policy.json", 
  "test_documents": ["PDD-VC-input.json", "final-PDD-vc.json"],
  "validation_artifacts": ["VM0033_Allcot_Test_Case_Artifact.xlsx"]
}
```

### Guardian Tools Testing

```json
{
  "tool_implementation": "AR-Tool-14.json",
  "methodology_reference": "ar-am-tool-14-v4.1.pdf",
  "integration_example": "vm0033-policy.json"
}
```

## Artifact Validation Process

### Step 1: Calculation Verification

1. Open relevant test artifact (e.g., `VM0033_Allcot_Test_Case_Artifact.xlsx`)
2. Review all input parameters and their sources
3. Verify calculation formulas match methodology requirements
4. Validate intermediate calculation steps
5. Confirm final emission reduction results

### Step 2: Guardian Implementation Testing

1. Use schema templates to structure Guardian schemas
2. Import test data from `final-PDD-vc.json` into Guardian policy
3. Run Guardian calculations using `er-calculations.js` reference
4. Compare Guardian outputs with Excel artifact results
5. Verify calculations match within acceptable tolerance

### Step 3: Production Validation

1. Use `vm0033-policy.json` for complete policy testing
2. Test with real project data from `ER_calculations_ABC Senegal.xlsx`
3. Validate Guardian policy produces expected emission reductions
4. Confirm integration with Guardian Tools like AR Tool 14

## Quality Assurance Standards

### Validation Criteria

✅ **Calculation Accuracy**: All calculations must match methodology requirements exactly\
✅ **Guardian Compatibility**: All artifacts tested with Guardian platform\
✅ **Production Ready**: Code and configurations validated in production environment\
✅ **Documentation Complete**: All artifacts include usage instructions and validation results

### File Integrity

* All JSON files validated for proper formatting
* All Excel files tested for calculation accuracy
* All JavaScript code tested in Guardian environment
* All PDF documents verified for completeness

## Integration with Handbook Parts

### Part III (Schema Design)

* Use schema templates for consistent schema development
* Reference PDD and Monitoring schema examples
* Follow Excel-first approach patterns

### Part IV (Policy Workflow)

* Reference `vm0033-policy.json` for production workflow patterns
* Use AR Tool integration examples for Guardian Tools

### Part V (Calculation Logic)

* Use `er-calculations.js` for customLogicBlock implementation
* Reference `AR-Tool-14.json` for Guardian Tools development
* Test with `final-PDD-vc.json` for validation

## Common Usage Patterns

### For New Methodology Implementation

1. Start with `schema-template-excel.xlsx` for schema design
2. Reference `VM0033-Methodology.md` for methodology understanding
3. Use `er-calculations.js` patterns for calculation implementation
4. Validate against test artifacts like `VM0033_Allcot_Test_Case_Artifact.xlsx`

### For Guardian Tools Development

1. Study `AR-Tool-14.json` for three-block pattern implementation
2. Reference `ar-am-tool-14-v4.1.pdf` for methodology understanding
3. Follow extractDataBlock → customLogicBlock → extractDataBlock pattern
4. Test integration with parent policies

### For Testing & Validation

1. Use Guardian's dry-run mode with policy artifacts
2. Test customLogicBlocks with `final-PDD-vc.json` input
3. Validate results against Excel test artifacts
4. Compare with real-world project data

***

{% hint style="success" %}
**Complete Artifact Collection**: This collection provides everything needed for Guardian methodology digitization, from initial schema design through production deployment and testing.
{% endhint %}

{% hint style="info" %}
**Regular Updates**: Artifacts are continuously updated based on Guardian platform evolution and methodology refinements. Always use the latest versions for development.
{% endhint %}

{% hint style="warning" %}
**Production Validation Required**: While all artifacts are tested, always validate in your specific Guardian environment before production deployment.
{% endhint %}
