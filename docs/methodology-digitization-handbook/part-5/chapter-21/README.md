# Chapter 21: Calculation Testing and Validation

> Comprehensive testing and validation using Guardian's dry-run mode and testing framework with VM0033 and AR Tool 14 test artifacts

This chapter demonstrates how to leverage Guardian's built-in testing capabilities to validate environmental methodology calculations. Using Guardian's dry-run mode, customLogicBlock testing interface, and our comprehensive VM0033 and AR Tool 14 test artifacts, you'll learn to validate calculations at every stage: baseline, project, leakage, and final net emission reductions.

## Learning Objectives

After completing this chapter, you will be able to:

* Utilize Guardian's dry-run mode for comprehensive policy testing
* Use Guardian's customLogicBlock testing interface for debugging calculations
* Validate calculations against methodology test artifacts at each stage
* Test baseline emissions, project emissions, leakage, and net emission reductions
* Debug calculation discrepancies using Guardian's built-in tools
* Implement automated testing using Guardian's API framework
* Create test suites using real methodology test data

## Prerequisites

* Completed Chapters 18-20: Custom Logic Block Development, Formula Linked Definitions, and Guardian Tools Architecture
* Access to test artifacts: [Final PDD VC with net ERR data](../../_shared/artifacts/final-PDD-vc.json), [AR Tool 14 implementation](../../_shared/artifacts/AR-Tool-14.json), [VM0033 test spreadsheet](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx)
* Understanding of Guardian [dry-run mode](../../../guardian/standard-registry/policies/dry-run/demo-guide-on-dry-run-operations.md)
* Familiarity with Guardian [testing interface](../../../guardian/standard-registry/policies/testing-debugging-code/testing-debugging-code-for-calculate-and-custom-logic-block-using-ui.md)

## Guardian's Built-in Testing Framework

### Why Guardian's Native Testing is Essential

Environmental methodology calculations directly impact carbon credit credibility and market trust. Guardian provides comprehensive testing capabilities specifically designed for environmental methodologies:

* **Dry-run mode** - Complete policy execution without blockchain transactions
* **CustomLogicBlock testing interface** - Interactive testing and debugging
* **Virtual users** - Multi-role workflow testing
* **Artifact tracking** - Complete audit trail of calculations
* **API testing framework** - Automated testing integration

### Policy Testing Hierarchy

Our recommended testing framework supports multiple validation levels:

1. **CustomLogicBlock Testing** - Individual calculation block validation using Guardian's [testing interface](../../../guardian/standard-registry/policies/testing-debugging-code/testing-debugging-code-for-calculate-and-custom-logic-block-using-ui.md)
2. **Dry-Run Policy Execution** - Complete workflow testing using [dry-run mode](../../../guardian/standard-registry/policies/dry-run/demo-guide-on-dry-run-operations.md)
3. **Tool Integration Testing** - AR Tool and other tool validations
4. **End-to-End Workflow Testing** - Complete credit issuance workflows
5. **Test Artifact Validation** - Against methodology spreadsheet test cases

## Working with VM0033 Test Artifacts

### VM0033 Test Case Artifacts

Our methodology implementation includes comprehensive test artifacts extracted from the official VM0033 test spreadsheet:

* [**VM0033 Test Spreadsheet**](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx) - Complete Allcot test case with all calculation stages
* [**Final PDD VC**](../../_shared/artifacts/final-PDD-vc.json) - Complete Guardian Verifiable Credential with net ERR data and test calculations
* [**ER Calculations**](../../_shared/artifacts/er-calculations.js) - JavaScript implementation of emission reduction calculations

### Understanding VM0033 Test Data Structure

The VM0033 test artifacts provide validation data for all calculation stages:

```javascript
// Structure from final-PDD-vc.json artifact
const vm0033TestData = {
    "document": {
        "credentialSubject": [{
            // Complete VM0033 test case data including:
            // - Baseline emissions calculations
            // - Project emissions calculations
            // - Leakage calculations
            // - Final net emission reduction results
            // - All intermediate calculation values
        }]
    }
};
```

#### Key Test Values from VM0033 Allcot Test Case:

* **Baseline Emissions**: Multiple ecosystem types and emission sources
* **Project Emissions**: Restoration activities and maintenance
* **Leakage**: Market and activity displacement calculations
* **Net Emission Reductions**: Final creditable emission reductions
* **Uncertainty Assessment**: Monte Carlo simulation results
* **SOC (Soil Organic Carbon)**: Soil carbon stock changes

## Using Guardian's CustomLogicBlock Testing Interface

### Interactive Testing and Debugging

Guardian provides a powerful testing interface specifically designed for customLogicBlock validation. This interface allows you to test calculation logic independently without running the entire policy.

#### Accessing the Testing Interface

Following Guardian's [testing documentation](../../../guardian/standard-registry/policies/testing-debugging-code/testing-debugging-code-for-calculate-and-custom-logic-block-using-ui.md):

1. **Navigate to Policy Editor** - Open your methodology policy in draft mode
2. **Select customLogicBlock** - Click on the calculation block you want to test
3. **Enter Testing Mode** - Click the "Test" button in the block configuration
4. **Configure Test Data** - Use schema-based input, JSON editor, or file upload
5. **Execute Test** - Run the calculation and examine results

![Custom Logic Block Testing UI](<../../../.gitbook/assets/image (148).png>)

#### Testing Input Methods

Guardian supports three primary input methods for testing:

**a. Schema-Based Input**

* Select a data schema from dropdown list
* Dynamic form generated based on schema
* Ideal for structured and guided input interface

**b. JSON Editor**

* Direct JSON-formatted data input
* Best for advanced users needing precise control
* Supports complex data structures

**c. File Upload**

* Upload JSON file containing test data
* Must be well-formed JSON
* Perfect for using our VM0033 test artifacts

### Testing VM0033 Calculations

#### Step 1: Get the PDD VC generated after submitting the new project data

Using our [Final PDD VC](../../_shared/artifacts/final-PDD-vc.json) artifact, fill in the JSON input data

![VC JSON INPUT](<../../../.gitbook/assets/image-2 (7).png>)

#### Step 2: Execute Test

1. **Open CustomLogicBlock** - Navigate to baseline calculation block in policy editor
2. **Upload Test Data** - Use file upload method with baselineTestInput JSON
3. **Run Test** - Execute the calculation
4. **Validate Results** - Compare outputs against expected values from VM0033 spreadsheet

#### Step 3: Using Debug Function

Guardian provides a `debug()` function for calculation tracing:

```javascript
// Example debugging in customLogicBlock
function calculateBaseline(document) {
    const baseline = document.baseline_scenario;

    // Calculate fire emissions
    const fireEmissions = baseline.area_data.baseline_fire_area *
                         baseline.emission_factors.fire_emission_factor;
    debug("Fire Emissions Calculation", {
        area: baseline.area_data.baseline_fire_area,
        factor: baseline.emission_factors.fire_emission_factor,
        result: fireEmissions
    });

    // Calculate total baseline emissions
    const totalBaseline = fireEmissions + /* other calculations */;
    debug("Total Baseline Emissions", totalBaseline);

    return totalBaseline;
}
```

Debug output appears in the **Logs** tab of the testing interface.

![Logs Tab UI](<../../../.gitbook/assets/image-3 (4).png>)

## Testing with Guardian's Dry-Run Mode

### Complete Policy Workflow Testing

Guardian's [dry-run mode](../../../guardian/standard-registry/policies/dry-run/demo-guide-on-dry-run-operations.md) allows testing complete methodology workflows without blockchain transactions.

#### Setting Up Dry-Run Mode

1. **Import Policy** - Import your VM0033 policy configuration
2. **Enable Dry-Run** - Change policy status from Draft to Dry-Run
3. **Create Virtual Users** - Set up test users for different roles (Project Developer, VVB, Registry)
4. **Execute Workflow** - Run complete credit issuance process

### Dry-Run Artifacts and Validation

Guardian's dry-run mode provides comprehensive tracking:

#### Transactions Tab

View mock transactions that would be executed on Hedera:

* Token minting transactions
* Document publishing transactions
* Schema registration transactions

#### Artifacts Tab

Review all generated documents:

* PDD Verifiable Credentials
* Monitoring Report VCs
* Validation Report VCs
* Verification Report VCs

#### IPFS Tab

Track files that would be stored in IPFS:

* Policy configuration files
* Schema definitions
* Document attachments

## API-Based Testing Framework

### Automated Testing with Guardian APIs

Guardian provides comprehensive APIs for automated testing workflows. Reference the [API automation testing guide](../../../api-automation-testing/how-to-perform-api-automation-testing.md).

#### Setting Up Cypress Testing

```bash
# From /e2e-tests folder
npm install cypress --save-dev

# Configure authorization in cypress.env.json
{
    "authorization": "your_access_token_here"
}

# Run specific methodology tests
npx cypress run --spec "tests/vm0033-methodology.cy.js"
```

### Dry-Run API Testing

Key API endpoints for testing:

```bash
# Start dry-run mode
PUT /api/v1/policies/{policyId}/dry-run

# Create virtual user
POST /api/v1/policies/{policyId}/dry-run/user

# Execute block dry-run
POST /api/v1/policies/{policyId}/dry-run/block

# Get transaction history
GET /api/v1/policies/{policyId}/dry-run/transactions

# Get artifacts
GET /api/v1/policies/{policyId}/dry-run/artifacts

# Restart policy execution
POST /api/v1/policies/{policyId}/dry-run/restart
```

## Best Practices for Methodology Testing

### Test Data Management

1. **Use Real Test Cases** - Always test against official methodology calculation spreadsheets
2. **Test All Calculation Paths** - Validate baseline, project, leakage, and net ERR calculations
3. **Include Edge Cases** - Test zero values, maximum values, and boundary conditions
4. **Maintain Test Data Versions** - Version control test artifacts alongside policy changes

### Testing Approach

1. **Start with CustomLogicBlock Testing** - Validate individual calculation functions first
2. **Progress to Dry-Run Testing** - Test complete workflows with virtual users
3. **Validate Against Spreadsheets** - Compare all outputs to methodology test cases
4. **Document Test Results** - Maintain testing logs and validation reports

### Debugging Calculation Issues

When calculations don't match expected results:

1. **Use Debug Functions** - Add debug() statements to trace calculation steps
2. **Check Units and Conversions** - Verify unit consistency across calculations
3. **Validate Input Data** - Ensure test data matches spreadsheet exactly
4. **Review Intermediate Results** - Break complex calculations into testable components
5. **Compare Against Reference Implementation** - Use our [ER calculations](../../_shared/artifacts/er-calculations.js) as reference

## Chapter Summary

Our testing framework provides comprehensive capabilities for validating environmental methodology calculations:

* **CustomLogicBlock Testing Interface** - Interactive testing and debugging with multiple input methods
* **Dry-Run Mode** - Complete policy workflow testing without blockchain transactions
* **Test Artifact Integration** - Validation against official methodology test cases
* **API Testing Framework** - Automated testing using Guardian's REST APIs
* **Comprehensive Tracking** - Artifacts, transactions, and IPFS file monitoring

### Key Testing Workflow

1. **Extract test data** from methodology spreadsheets like VM0033\_Allcot\_Test\_Case\_Artifact.xlsx
2. **Test individual calculations** using CustomLogicBlock testing interface
3. **Validate complete workflows** using dry-run mode with virtual users
4. **Compare results** against expected values from official test cases
5. **Debug discrepancies** using Guardian's built-in debugging tools
6. **Automate regression testing** using Cypress and Guardian APIs

### Next Steps

This completes Part V: Calculation Logic Implementation. With comprehensive testing validation, your Guardian methodology implementations are ready for production deployment with confidence in calculation accuracy.

## References and Further Reading

* [Guardian Dry-Run Mode Documentation](../../../guardian/standard-registry/policies/dry-run/demo-guide-on-dry-run-operations.md)
* [CustomLogicBlock Testing Interface](../../../guardian/standard-registry/policies/testing-debugging-code/testing-debugging-code-for-calculate-and-custom-logic-block-using-ui.md)
* [Guardian API Automation Testing](../../../api-automation-testing/how-to-perform-api-automation-testing.md)
* [VM0033 Test Artifacts](../../_shared/artifacts/) - Complete test dataset for validation
* [AR Tool 14 Implementation](../../_shared/artifacts/AR-Tool-14.json) - Production tool configuration

***
