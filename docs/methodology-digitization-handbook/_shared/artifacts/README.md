# рџ—‚пёЏ Artifacts Collection

> Test artifacts, calculation tools, and reference materials for methodology digitization

## Overview

This directory contains essential artifacts and tools used throughout the methodology digitization process to ensure accuracy, consistency, and quality validation.

## Available Artifacts

### Reference Documentation

#### [VM0033-Methodology.md](VM0033-Methodology.md)

Complete parsed and structured version of the VM0033 methodology document, including:

* Structured methodology text with proper formatting
* All equations and calculation formulas
* Parameter definitions and requirements
* Tools and modules documentation
* Methodology-specific guidance

#### [VM0033-Methodology\_meta.json](VM0033-Methodology_meta.json)

Metadata and structural information for the VM0033 methodology:

* Document structure and sections
* Equation references and locations
* Parameter cross-references
* Validation checkpoints

### Test Case Artifacts

#### [VM0033\_Allcot\_Test\_Case\_Artifact.xlsx](VM0033_Allcot_Test_Case_Artifact.xlsx)

Official test case artifact developed with Verra using real Allcot ABC Mangrove project data, including:

* Actual project parameters from implemented restoration activities
* Real-world baseline emissions calculations
* Documented project emissions calculations
* Leakage calculations based on actual project conditions
* Final emission reduction results for validation
* Comprehensive test scenarios covering different wetland types and restoration activities

#### [ER\_calculations\_ABC Senegal.xlsx](ER_calculations_ABC%20Senegal.xlsx)

Real-world emission reduction calculations for ABC Senegal project, demonstrating:

* Practical application of methodology calculations
* Project-specific parameter values
* Verification data points

### Tools and Templates

#### [excel\_artifact\_extractor.py](excel_artifact_extractor.py)

Python tool for extracting and validating calculation data from Excel artifacts:

* Automated parameter extraction
* Calculation validation
* Schema generation support
* Quality assurance checks

#### [schema-template-excel.xlsx](schema-template-excel.xlsx)

Standard Excel template for creating Guardian schemas:

* Pre-configured field types
* Validation rules
* Guardian-compatible structure
* Import-ready format

## Usage Guidelines

### For Methodology Developers

1. **Use Test Artifacts**: Validate all calculations against provided test cases
2. **Follow Templates**: Use schema template for consistent Guardian integration
3. **Extract with Tools**: Use Python extractor for automated validation

### For Policy Implementers

1. **Reference Calculations**: Use artifacts to verify Guardian policy math
2. **Validate Results**: Compare Guardian outputs against artifact benchmarks
3. **Test with Real Data**: Use project examples for integration testing

## Artifact Validation Process

### Step 1: Calculation Verification

```markdown
1. Open relevant test artifact (e.g., VM0033_Allcot_Test_Case_Artifact.xlsx)
2. Review all input parameters and their sources
3. Verify calculation formulas match methodology requirements
4. Validate intermediate calculation steps
5. Confirm final emission reduction results
```

### Step 2: Guardian Integration Testing

```markdown
1. Use schema-template-excel.xlsx to structure Guardian schemas
2. Import test data from artifacts into Guardian policy
3. Run Guardian calculations and compare with artifact results
4. Verify calculations match within acceptable tolerance
5. Document any discrepancies and resolution steps
```

### Step 3: Real-World Validation

```markdown
1. Use project examples (e.g., ER_calculations_ABC Senegal.xlsx)
2. Test Guardian policy with real project data
3. Validate results against actual project outcomes
4. Confirm Guardian policy produces expected emission reductions
```

## Tool Usage

### Excel Artifact Extractor

```python
# List all workbooks in artifacts folder
python excel_artifact_extractor.py list-workbooks

# Extract tabs from specific workbook
python excel_artifact_extractor.py extract-tabs VM0033_Allcot_Test_Case_Artifact.xlsx

# Extract content from specific tab
python excel_artifact_extractor.py extract-tab-content VM0033_Allcot_Test_Case_Artifact.xlsx "ProjectBoundary"

# Extract Guardian schema structure
python excel_artifact_extractor.py extract-schema-structure schema-template-excel.xlsx

# Extract parameters from specific tab
python excel_artifact_extractor.py extract-parameters VM0033_Allcot_Test_Case_Artifact.xlsx "StratumLevelInput + UI Req"
```

## Quality Assurance

### Validation Criteria

* ✅ All calculations must match methodology requirements exactly
* ✅ Test artifacts must include comprehensive parameter coverage
* ✅ Guardian policies must produce identical results to Excel calculations
* ✅ Real-world examples must demonstrate practical applicability

### Common Issues and Solutions

**Calculation Discrepancies**

* Verify formula references and cell calculations
* Check unit conversions and scaling factors
* Validate input parameter sources and values

**Schema Import Errors**

* Use schema-template-excel.xlsx for proper formatting
* Verify field types match Guardian requirements
* Check for missing required fields

**Guardian Integration Issues**

* Compare JavaScript calculations with Excel formulas
* Verify variable naming consistency
* Test with boundary conditions and edge cases

## Integration with Other Shared Resources

* **Templates**: Use [templates](../templates/) for documenting artifact usage
* **VM0033 Integration**: Reference [VM0033 system](../vm0033-integration/) for methodology-specific artifacts
* **Guardian Integration**: Follow [Guardian patterns](../guardian-integration/) for policy implementation

***

{% hint style="info" %}
**Quality Validation**: All artifacts in this collection have been validated against their respective methodologies and tested with Guardian implementation.
{% endhint %}

{% hint style="warning" %}
**Accuracy Critical**: These artifacts serve as the ground truth for calculation validation. Any modifications must be thoroughly tested and documented.
{% endhint %}
