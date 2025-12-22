# Chapter 16: Advanced Policy Patterns

> Exploring advanced Guardian policy features for production methodologies including external data integration, document validation, API transformation, and policy testing

Building on VM0033's implementation patterns from Chapter 15, Chapter 16 explores advanced features that enable production-scale policy deployment. These patterns handle external data integration, document validation, API transformations, and testing workflows essential for real-world carbon credit programs.

## 1. Data Transformation Blocks for API Integration

### Verra Project Hub API Integration

VM0033 implements a `dataTransformationAddon` that converts Guardian project submissions into Verra's Project Hub compatible API payloads, enabling automatic project registration with external registries.

#### VM0033 Project Description Transformation Block

The transformation block in VM0033 (tag: `project-description`) demonstrates how Guardian can transform internal project data into external API formats:

```json
{
  "id": "819d94e8-7d1d-43c1-a228-9b6fa1982e3f",
  "blockType": "dataTransformationAddon",
  "defaultActive": false,
  "permissions": ["Project_Proponent"],
  "onErrorAction": "no-action",
  "tag": "project-description",
  "expression": "(function calc() {\n  const jsons = [];\n  if (documents && documents.length > 0) {\n    documents.forEach((doc) => {\n      const document = doc.document;\n\n      const json = {\n        id: '',\n        projectNumber: null,\n        accountId: '',\n        standardTemplate: '',\n        standardTemplateName: '',\n        methodologyTemplateTitle: '',\n        methodologyTemplate: '',\n        projectName: '',\n        projectDescription: '',\n        website: null,\n        projectSubmissionStatus: 'Draft',\n        fetchProjectBoundaryFromCalculationInput: false,\n        estimatedProjectStartDate: '',\n        creditPeriod: {\n          startDate: '',\n          endDate: ''\n        },\n        projectSize: null,\n        averageAnnualVolume: null,\n        integratedModules: null,\n        integratedTools: null,\n        integratedMethodologies: null,\n        projectType: '14',\n        useManualCalculation: null,\n        locations: [],\n        projectProponents: [''],\n        projectProponentsWithDetails: null,\n        vcs: {\n          afoluActivities: [],\n          projectValidatorId: null,\n          additionalProjectTypes: [],\n          earlyAction: null\n        },\n        ccb: {\n          ccbStandard: null,\n          ccbStandardName: null,\n          projectTypeId: null,\n          distinctions: [],\n          auditorSiteVisitStartDate: null,\n          auditorSiteVisitEndDate: null,\n          ccbVerifierList: [],\n          projectValidatorId: null\n        },\n        sdVista: null,\n        plasticWRP: null,\n        registryDocumentUploadData: null,\n        calculationInputs: {\n          projectBoundaryProject: ['', '', '', '', '', '', '', '', '', ''],\n          projectBoundaryBaseline: ['', '', '', '', '', '', '', '', '', '']\n        },\n        otherJsonContents: {\n          cover: {\n            version: '',\n            projectId: '',\n            dateOfIssue: '',\n            projectTitle: '',\n            projectWebsite: '',\n            projectLifeTime: {\n              endDate: null,\n              startDate: null\n            },\n            standardVersion: '',\n            accountingPeriod: {\n              endDate: null,\n              startDate: null\n            },\n            expectedSchedule: '',\n            projectProponent: '',\n            verificationBody: '',\n            goldLevelCriteria: '',\n            recentDateOfIssue: '',\n            ccbStandardVersion: '',\n            documentPreparedBy: '',\n            historyOfCcbStatus: '',\n            multipleProjectLocation: null\n          }\n        }\n      };\n\n      jsons.push(json);\n    });\n  }\n  return jsons;\n})"
}
```

**Key Transformation Features:**

1. **API Compatibility**: Creates Verra Project Hub API-compatible JSON structure
2. **Data Mapping**: Maps Guardian schema fields to external registry requirements
3. **Standard Integration**: Handles VCS and CCB standard-specific fields
4. **Default Values**: Sets appropriate defaults for registry submission status
5. **Bulk Processing**: Processes multiple documents in single transformation

**Implementation Pattern:**

```javascript
// Guardian to Verra API transformation pattern
function transformProjectData(guardianDocument) {
  // Extract Guardian schema data
  const projectData = guardianDocument.credentialSubject[0];

  // Map to Verra API structure
  return {
    projectName: projectData.project_details.G5,
    projectDescription: projectData.project_details.project_description,
    estimatedProjectStartDate: projectData.crediting_period.start_date,
    projectType: '14', // VM0033 wetland restoration
    vcs: {
      afoluActivities: ['Wetland restoration'],
      projectValidatorId: null
    },
    locations: [{
      country: projectData.location.country,
      coordinates: projectData.location.coordinates
    }]
  };
}
```

![Sample project view in Verra Project Hub](<../../../.gitbook/assets/image (77).png>)

### Implementation Use Cases

**Carbon Registry Integration:**

* Automatic project listing with Verra, Gold Standard, or other registries
* Real-time status synchronization between Guardian and external systems
* Standardized data exchange for multi-registry projects

**Corporate Reporting:**

* Transform carbon project data for corporate sustainability reporting
* Generate API payloads for ESG reporting platforms
* Create standardized data formats for carbon accounting systems

***

## 2. Document Validation Blocks

Guardian's `documentValidatorBlock` ensures document integrity and compliance throughout policy workflows. This block validates document structure, content, and relationships before processing continues.

### Document Validation Architecture

```json
{
  "blockType": "documentValidatorBlock",
  "tag": "validate_project_submission",
  "permissions": ["VVB"],
  "defaultActive": true,
  "onErrorAction": "no-action",
  "stopPropagation": true,
  "documentType": "VC Document",
  "checkSchema": true,
  "checkOwnDocument": true,
  "checkAssignDocument": false,
  "conditions": [
    {
      "type": "Equal",
      "field": "document.type",
      "value": "project"
    },
    {
      "type": "Not Equal",
      "field": "option.status",
      "value": "Rejected"
    },
    {
      "type": "In",
      "field": "document.credentialSubject.0.methodology",
      "value": ["VM0033", "VM0007", "VM0048"]
    }
  ]
}
```

**Validation Types:**

1. **Schema Validation**: Ensures documents conform to defined JSON schemas
2. **Ownership Validation**: Verifies document ownership and assignment rules
3. **Content Validation**: Checks specific field values and business logic
4. **Relationship Validation**: Validates links between related documents

**Condition Types:**

| Type          | Description                 | Example Use Case                   |
| ------------- | --------------------------- | ---------------------------------- |
| **Equal**     | Field equals specific value | `document.type = "project"`        |
| **Not Equal** | Field does not equal value  | `status ≠ "Rejected"`              |
| **In**        | Field value in array        | `methodology ∈ [VM0033, VM0007]`   |
| **Not In**    | Field value not in array    | `country ∉ [sanctioned_countries]` |

### Practical Validation Examples

**Project Eligibility Validation:**

```json
{
  "blockType": "documentValidatorBlock",
  "tag": "validate_project_eligibility",
  "conditions": [
    {
      "type": "Equal",
      "field": "document.credentialSubject.0.project_type",
      "value": "wetland_restoration"
    },
    {
      "type": "In",
      "field": "document.credentialSubject.0.location.country",
      "value": ["USA", "Canada", "Mexico"]
    },
    {
      "type": "Not Equal",
      "field": "document.credentialSubject.0.start_date",
      "value": ""
    }
  ]
}
```

**VVB Assignment Validation:**

```json
{
  "blockType": "documentValidatorBlock",
  "tag": "validate_vvb_assignment",
  "checkAssignDocument": true,
  "conditions": [
    {
      "type": "Equal",
      "field": "assignedTo",
      "value": "[current_user_did]"
    },
    {
      "type": "Equal",
      "field": "option.status",
      "value": "Assigned for Validation"
    }
  ]
}
```

**Note**: While VM0033 doesn't use `documentValidatorBlock` in its current implementation, it relies on other validation mechanisms including `documentsSourceAddon` filters and `customLogicBlock` validations to ensure document integrity.

***

## 3. External Data Integration

Guardian's `externalDataBlock` enables policies to integrate with external APIs and data providers for real-time environmental monitoring and verification.

### External Data Block Architecture

```json
{
  "blockType": "externalDataBlock",
  "tag": "kanop_mrv_data",
  "permissions": ["Project_Proponent"],
  "defaultActive": true,
  "entityType": "MRV",
  "schema": "#satellite-monitoring-schema"
}
```

### Example 1: Kanop Environmental Data Integration

Kanop provides satellite-based MRV technology for nature-based carbon projects. Integration enables automatic data retrieval for biomass monitoring, forest cover analysis, and carbon stock assessments. External data block can be used to integrate and get data from Kanop.

### Example 2: IoT Device Integration for Cookstove Projects

For metered cookstove projects, external data blocks can integrate with IoT devices to collect real-time usage data:

```json
{
  "blockType": "externalDataBlock",
  "tag": "iot_stove_data",
  "permissions": ["Project_Proponent"],
  "entityType": "StoveUsage",
  "schema": "#iot-monitoring-schema"
}
```

**IoT Data Processing:**

```javascript
// Process IoT cookstove data for emission calculations
function processStoveUsageData(iotData) {
  return {
    total_fuel_saved_kg: iotData.fuel_consumption.baseline - iotData.fuel_consumption.project,
    average_efficiency: iotData.efficiency_metrics.mean,
    usage_hours_per_day: iotData.burn_duration.daily_average,
    co2_emissions_reduced: calculateEmissionReductions(iotData.fuel_consumption),
    data_quality_score: iotData.quality_metrics.completeness
  };
}
```

### Real-Time Data Validation

External data integration includes validation mechanisms to ensure data quality:

```json
{
  "blockType": "documentValidatorBlock",
  "tag": "validate_external_data",
  "conditions": [
    {
      "type": "Not Equal",
      "field": "satellite_data.confidence_level",
      "value": null
    },
    {
      "type": "In",
      "field": "satellite_data.confidence_level",
      "value": ["high", "medium"]
    },
    {
      "type": "Not Equal",
      "field": "satellite_data.measurement_date",
      "value": ""
    }
  ]
}
```

![External MRV data example - Taken from Metered energy policy](<../../../.gitbook/assets/image-1 (7).png>)

***

## 4. Policy Testing Framework

Guardian provides robust testing capabilities for policy validation before production deployment, including manual dry-run testing and programmatic test automation.

### Dry-Run Mode Testing

Dry-run mode enables complete policy testing as the name suggests. Policy developer can take up different roles and simulate the entire process end to end to verify everything works.

**Starting Dry-Run Mode:**

You can trigger dry run either via policy editor UI or API

![Click dry run on top of menu bar in policy editor UI](<../../../.gitbook/assets/image-2 (6).png>)

```bash
# Via API
PUT /api/v1/policies/{policyId}/dry-run
```

**Dry-Run Features:**

1. **Virtual Users**: Create test users without real Hedera accounts
2. **Mock Transactions**: Simulate blockchain transactions locally
3. **Local Storage**: Store all documents and artifacts in database
4. **Full Workflow**: Test complete certification workflows
5. **State Management**: Save and restore workflow states with savepoints

### Dry-Run Workflow Operations

**Key Operations Available in Dry-Run Mode:**

1.  **Restart**: Reset policy state and remove all previous dry-run records

    ```bash
    POST /api/v1/policies/{policyId}/dry-run/restart
    ```
2.  **View Transactions**: Examine mock blockchain transactions

    ```bash
    GET /api/v1/policies/{policyId}/dry-run/transactions?pageIndex=0&pageSize=100
    ```
3.  **View Artifacts**: Review all generated documents

    ```bash
    GET /api/v1/policies/{policyId}/dry-run/artifacts?pageIndex=0&pageSize=100
    ```
4.  **View IPFS Files**: Check files that would be stored in IPFS

    ```bash
    GET /api/v1/policies/{policyId}/dry-run/ipfs?pageIndex=0&pageSize=100
    ```
5. **Savepoints**: Create and restore workflow checkpoints for testing different scenarios

### Programmatic Policy Testing

Guardian supports automated policy testing with predefined test scenarios and expected outcomes.

**Adding Test Cases:**

Tests are embedded in policy files and executed programmatically:

```json
{
  "policyTests": [
    {
      "name": "Complete Project Lifecycle",
      "description": "Test full project workflow from submission to token issuance",
      "steps": [
        {
          "action": "submit_project",
          "user": "Project_Proponent",
          "data": "test_project_pdd.json",
          "expectedStatus": "Waiting to be Added"
        },
        {
          "action": "approve_project",
          "user": "OWNER",
          "expectedStatus": "Approved"
        },
        {
          "action": "assign_vvb",
          "user": "Project_Proponent",
          "data": {"vvb_did": "test_vvb_001"},
          "expectedStatus": "Assigned for Validation"
        },
        {
          "action": "validate_project",
          "user": "VVB",
          "expectedStatus": "Validated"
        }
      ],
      "expectedOutcome": {
        "tokens_minted": 1000,
        "documents_created": 4,
        "final_status": "Credited"
      }
    }
  ]
}
```

**Running Automated Tests:**

```bash
# Run all policy tests
POST /api/v1/policies/{policyId}/tests/run

# Run specific test
POST /api/v1/policies/{policyId}/tests/{testId}/run

# Get test results
GET /api/v1/policies/{policyId}/tests/{testId}/results
```

### Test Result Analysis

```json
{
  "testId": "complete_lifecycle_test",
  "status": "SUCCESS",
  "duration": "45.2s",
  "steps": [
    {
      "step": "submit_project",
      "status": "PASSED",
      "actualStatus": "Waiting to be Added",
      "expectedStatus": "Waiting to be Added"
    },
    {
      "step": "approve_project",
      "status": "PASSED",
      "actualStatus": "Approved",
      "expectedStatus": "Approved"
    }
  ],
  "artifacts": {
    "documentsCreated": 4,
    "tokensMinted": 1000,
    "transactionsSimulated": 12
  }
}
```

### Test Failure Analysis

When tests fail, Guardian provides detailed comparison and debugging information:

```json
{
  "testId": "validation_workflow_test",
  "status": "FAILURE",
  "failureReason": "Document validation failed",
  "failedStep": {
    "step": "validate_project",
    "expected": "Validated",
    "actual": "Validation Failed",
    "error": "Missing required field: baseline_methodology"
  },
  "documentComparison": {
    "expected": {
      "status": "Validated",
      "validation_report": "present"
    },
    "actual": {
      "status": "Validation Failed",
      "validation_errors": ["baseline_methodology is required"]
    }
  }
}
```

**Testing Best Practices:**

1. **Test Coverage Strategy**: Test each stakeholder workflow independently, validate all document state transitions, test error handling and edge cases
2. **Test Data Management**: Create realistic test datasets matching production scenarios, use boundary value testing for numerical inputs
3. **Continuous Testing**: Run tests after each policy modification, automate testing in CI/CD pipelines

***

## 5. Demo Mode for Simplified Testing

Guardian provides **Demo Mode** as a simplified approach to policy testing, particularly useful for novice users and quick policy validation. Demo mode is selected during policy import.

### Demo Mode Features

Demo Mode operates similarly to dry-run but with enhanced user interface simplification:

* **Read-Only Policy Processing**: All policy processing is read-only, policy editing is not possible
* **No External Communication**: No communication with external systems such as Hedera network or IPFS
* **Simplified UI**: Streamlined interface designed for ease of use
* **Local Storage**: All artifacts stored locally similar to dry-run mode

## Summary

Chapter 16 demonstrated Guardian's advanced policy patterns essential for production deployment:

1. **Data Transformation**: VM0033's `project-description` transformation block converts Guardian project data to Verra API-compatible formats for automatic registry integration
2. **Document Validation**: `documentValidatorBlock` provides robust validation with condition-based rules for ensuring document integrity and business logic compliance
3. **External Data Integration**: `externalDataBlock` enables integration with providers like Kanop for satellite monitoring and IoT devices for real-time environmental data
4. **Policy Testing**: Dry-run mode and automated testing frameworks validate complete workflows before production deployment
5. **Demo Mode**: Simplified testing environment for quick policy validation and novice user training

## These patterns enable Guardian policies to integrate with real-world carbon markets, environmental monitoring systems, and corporate reporting platforms while maintaining data integrity and audit trails.

**Next Steps**: Part V covers the calculation logic implementation, diving deep into methodology-specific emission reduction calculations and the JavaScript calculation engine that powers Guardian's environmental accounting.

**Prerequisites Check**: Ensure you have:

* [ ] Completed Chapters 14-15 (Policy architecture and VM0033 implementation)
* [ ] Access to external API documentation for your methodology
* [ ] Test datasets for policy validation
* [ ] Understanding of your methodology's data requirements

**Time Investment**: \~25 minutes reading + \~90 minutes hands-on testing with dry-run mode

**Practical Exercises**:

1. **Dry-Run Testing**: Import and set up VM0033 in dry-run mode and test complete project lifecycle
2. **External Data Integration**: Configure external data block for your methodology's monitoring requirements
3. **Document Validation**: Implement validation rules for your specific business logic
4. **API Transformation**: Create transformation block for your target registry's API format
