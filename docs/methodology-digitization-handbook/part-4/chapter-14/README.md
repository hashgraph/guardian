# Chapter 14: Guardian Workflow Blocks and Configuration

> Step-by-step configuration of Guardian's workflow blocks for complete methodology automation

Chapter 13 introduced Guardian's block-event architecture. Chapter 14 gets hands-on, showing you how to configure each workflow block type using real examples from VM0033's production policy.

Guardian provides over 25 workflow blocks, each serving specific purposes in methodology automation. Rather than memorizing every block parameter, this chapter teaches you configuration patterns that apply across different block types.

## Configuration Fundamentals

### Block Configuration Methods

Guardian offers three ways to configure workflow blocks:

1. **Properties Tab**: Visual interface for common settings
2. **Events Tab**: Graphical event connection management
3. **JSON Tab**: Direct JSON manipulation for advanced configurations

![Guardian Block Configuration - Properties Tab](<../../../.gitbook/assets/image (74).png>)

![Guardian Block Configuration - Events Tab](<../../../.gitbook/assets/image-1 (6).png>)

![Guardian Block Configuration - JSON Tab](<../../../.gitbook/assets/image-2 (5).png>)

### Block Structure Basics

Every Guardian workflow blocks follow similar JSON structure:

```json
{
  "id": "#unique-uuid",
  "blockType": "requestVcDocumentBlock",
  "tag": "unique-semantic-name",
  "permissions": ["Project_Proponent"],
  "uiMetaData": {
    "title": "Submit PDD",
    "description": "Project Design Document submission"
  },
  "children": [],
  "events": []
}
```

**Key Configuration Elements:**

* **id**: Unique identifier (Guardian auto-generates)
* **blockType**: Defines block functionality
* **tag**: Human-readable name for referencing in events
* **permissions**: Which roles can access this block
* **uiMetaData**: Display settings and user interface configuration
* **children**: Nested blocks for containers
* **events**: Event triggers connecting to other blocks

### Permission Patterns

Guardian uses role-based permissions consistently across blocks:

* `["OWNER"]`: Standard Registry only
* `["Project_Proponent"]`: Project Developers only
* `["VVB"]`: Validation/Verification Bodies only
* `["OWNER", "Project_Proponent"]`: Multiple roles
* `["ANY_ROLE"]`: All authenticated users
* `["NO_ROLE"]`: Unauthenticated users (role selection)

## Data Input and Management Blocks

These blocks handle document collection, storage, and display.

### requestVcDocumentBlock: Schema-Based Forms

Transforms your Part III schemas into interactive forms. VM0033 uses this for PDD and monitoring report submission.

**Basic Configuration:**

```json
{
  "blockType": "requestVcDocumentBlock",
  "tag": "new_project",
  "permissions": ["Project_Proponent"],
  "schemaId": "#9122bbd0-d96e-40b1-92f6-7bf60b68137c",
  "uiMetaData": {
    "title": "New Project",
    "description": "Submit Project Design Document",
    "type": "dialog"
  }
}
```

**VM0033 Example - PDD Submission:** The VM0033 policy uses `new_project` block to collect Project Design Documents. The `schemaId` references the PDD schema, automatically generating form fields for:

* Project details and location
* Baseline emission calculations
* Project emission parameters
* Monitoring plan specifications

**Your Implementation:** Replace VM0033's schema ID with your Part III PDD schema UUID. Guardian automatically creates form fields based on your schema structure.

### sendToGuardianBlock: Document Storage

Stores submitted documents to database or Hedera blockchain with status tracking.

![Guardian sendToGuardianBlock Configuration](<../../../.gitbook/assets/image-3 (3).png>)

**Database Storage Configuration:**

```json
{
  "id": "0c6dabc8-43aa-424e-bd80-972302ebdc18",
  "blockType": "sendToGuardianBlock",
  "tag": "save_project_auto",
  "permissions": ["Project_Proponent"],
  "dataSource": "database",
  "documentType": "vc",
  "entityType": "project",
  "options": [
    {
      "name": "status",
      "value": "Waiting to be Added"
    }
  ]
}
```

**Hedera Blockchain Storage Configuration:**

```json
{
  "id": "8b45d09b-03a2-4f9f-9162-6ebb2f3878a9",
  "blockType": "sendToGuardianBlock",
  "tag": "save_project_auto_hedera",
  "permissions": ["Project_Proponent"],
  "dataSource": "hedera",
  "documentType": "vc",
  "topic": "Project",
  "entityType": "project",
  "options": [
    {
      "name": "status",
      "value": "Waiting to be Added"
    }
  ]
}
```

**Storage Options Comparison:**

| Feature          | Database | Hedera    | Usage                                  |
| ---------------- | -------- | --------- | -------------------------------------- |
| **Speed**        | Fast     | Slower    | Database for drafts, Hedera for finals |
| **Cost**         | Free     | HBAR fees | Database for frequent updates          |
| **Immutability** | Mutable  | Immutable | Hedera for audit trails                |
| **Transparency** | Private  | Public    | Hedera for verification                |

**Status Management:** The `options` array sets document status values that other blocks can filter on. For example:

* `"Waiting to be Added"`: New submissions awaiting registry review
* `"Waiting for Validation"`: Projects ready for VVB assignment
* `"Validated"`: Successfully validated projects
* `"Minting"`: Approved for token issuance

**Key Configuration Fields:**

* `entityType`: Groups related documents (e.g., "project", "report")
* `topic`: Hedera topic for blockchain storage organization. Helpful with Guardian indexer querying.
* `documentType`: "vc" for Verifiable Credentials, "vp" for Verifiable Presentations

### interfaceDocumentsSourceBlock: Document Grids

Displays document collections with filtering, search, and action buttons. Works with child `documentsSourceAddon` blocks to provide data.

**VM0033 Real Configuration - Project Pipeline:**

```json
{
  "blockType": "interfaceDocumentsSourceBlock",
  "tag": "project_grid_verra",
  "permissions": ["OWNER"],
  "uiMetaData": {
    "fields": [
      {
        "title": "Summary",
        "name": "document.credentialSubject.0.project_details.G5",
        "type": "text"
      },
      {
        "title": "Status",
        "name": "option.status",
        "type": "text",
        "width": "150px"
      },
      {
        "title": "Add",
        "name": "add",
        "type": "block",
        "bindBlock": "add_project",
        "bindGroup": "project_grid_verra_waiting_to_add_projects",
        "width": "150px"
      },
      {
        "title": "Document",
        "name": "document",
        "type": "button",
        "action": "dialog",
        "dialogContent": "VC",
        "dialogType": "json",
        "content": "View Document",
        "uiClass": "link",
        "width": "150px"
      }
    ]
  },
  "children": [
    {
      "blockType": "documentsSourceAddon",
      "tag": "project_grid_verra_waiting_to_add_projects",
      "dataType": "vc-documents",
      "schema": "#9122bbd0-d96e-40b1-92f6-7bf60b68137c",
      "filters": [
        {
          "field": "option.status",
          "type": "equal",
          "value": "Waiting to be Added"
        },
        {
          "field": "type",
          "type": "equal",
          "value": "project"
        }
      ]
    }
  ]
}
```

**Key Configuration Properties:**

* **uiMetaData.fields**: Array defining grid columns and their properties
* **dataType**: Handled by child `documentsSourceAddon` blocks
* **bindBlock**: References another block (buttonBlock) to embed in the column
* **bindGroup**: Links to specific `documentsSourceAddon` child blocks for conditional display

**Field Type Details:**

**Text Fields:**

```json
{
  "title": "Project Name",
  "name": "document.credentialSubject.0.field0",
  "type": "text",
  "width": "200px"
}
```

**Button Fields:**

```json
{
  "title": "Document",
  "name": "document",
  "type": "button",
  "action": "dialog",
  "dialogContent": "VC",
  "dialogType": "json",
  "content": "View Document"
}
```

**Block Fields (for embedded buttons):**

```json
{
  "title": "Operations",
  "name": "option.status",
  "type": "block",
  "bindBlock": "approve_documents_btn",
  "bindGroup": "vvb_grid_verra_documents_to_approve"
}
```

**Required Child Blocks:** interfaceDocumentsSourceBlock must have child `documentsSourceAddon` blocks that provide the actual data. The `bindGroup` property links specific columns to specific data sources.

## Logic and Calculation Blocks

These blocks process data, validate inputs, and execute methodology calculations.

### customLogicBlock: Calculation Engine

Executes JavaScript or Python for emission reduction calculations using schema field data.

**VM0033 Real Configuration:**

```json
{
  "blockType": "customLogicBlock",
  "tag": "automatic_report",
  "permissions": ["Project_Proponent"],
  "expression": "const document = documents[0].document;\n// Emission reduction calculation code\ndone(adjustValues(document.credentialSubject[0]));"
}
```

**Key Configuration Properties:**

* **expression**: JavaScript or Python code as a string
* **permissions**: Which roles can trigger the calculation
* **defaultActive**: Whether the block executes automatically
* **onErrorAction**: How to handle calculation errors

**VM0033 JavaScript Example:**

```javascript
// Wetland restoration emission reduction calculation
function calculateEmissionReductions() {
    const document = documents[0].document;
    const creds = document.credentialSubject;

    let totalVcus = 0;

    for (const cred of creds) {
        for (const instance of cred.project_data_per_instance) {

            // Get project parameters
            const data = instance.project_instance;
            const creditingPeriod = data.individual_parameters.crediting_period;
            const bufferPercentage = data.individual_parameters['buffer_%'];
            const allowableUncert = data.individual_parameters.allowable_uncert;

            // Process baseline emissions (GHG_BSL)
            processBaselineEmissions(
                data.baseline_emissions,
                creditingPeriod,
                data.monitoring_period_inputs,
                data.temporal_boundary
            );

            // Process project emissions (GHG_WPS)
            processProjectEmissions(
                data.project_emissions,
                data.individual_parameters.gwp_ch4,
                data.individual_parameters.gwp_n2o
            );

            // Calculate SOC maximum deduction
            SOC_MAX_calculation(
                data.baseline_emissions,
                data.peat_strata_input_coverage_100_years,
                data.temporal_boundary,
                data.ineligible_wetland_areas
            );

            // Net emission reductions and VCU calculation
            processNETERR(
                data.baseline_emissions,
                data.project_emissions,
                data.net_ERR,
                data.ineligible_wetland_areas.SOC_MAX,
                bufferPercentage
            );

            totalVcus += data.net_ERR.total_VCU_per_instance;
        }
        cred.total_vcus = totalVcus;
    }

    done(adjustValues(document.credentialSubject[0]));
}

calculateEmissionReductions();
```

**Your Implementation:** Use your Part III schema field names as JavaScript variables. The calculation result creates new document fields accessible by other blocks.

### documentValidatorBlock: Data Validation

Validates documents against methodology rules beyond basic schema validation.

**Configuration Pattern:**

```json
{
  "blockType": "documentValidatorBlock",
  "tag": "validate_monitoring_report",
  "permissions": ["VVB"],
  "schemaId": "#monitoring-schema-uuid",
  "conditions": [
    {
      "field": "monitoring_period_days",
      "condition": ">=",
      "value": 365
    }
  ]
}
```

**Validation Rules:**

* Field value comparisons (`>=`, `<=`, `==`, `!=`)
* Cross-field validation (one field depends on another)
* Date range checking for monitoring periods
* Numeric range validation for emission factors

### switchBlock: Conditional Branching

Creates different workflow paths based on data values or user decisions.

**Configuration Pattern:**

```json
{
  "blockType": "switchBlock",
  "tag": "validation_decision",
  "permissions": ["VVB"],
  "conditions": [
    {
      "field": "validation_result",
      "value": "Approved",
      "condition": "equal"
    }
  ]
}
```

**VM0033 Usage:** VVB validation decisions create different paths:

* **Approved**: Project proceeds to monitoring phase
* **Rejected**: Project returns to developer for revision
* **Conditional Approval**: Project requires minor corrections

## Token and Asset Management Blocks

These blocks handle carbon credit lifecycle from calculation to retirement.

### mintDocumentBlock: Token Issuance

Issues VCU tokens based on verified emission reduction calculations.

**VM0033 Real Configuration:**

```json
{
  "blockType": "mintDocumentBlock",
  "tag": "mintToken",
  "permissions": ["OWNER"],
  "rule": "net_GHG_emissions_reductions_and_removals.NERRWE",
  "tokenId": "66754448-ac59-4758-bc43-b075334daced",
  "accountType": "default"
}
```

**Key Configuration Properties:**

* **rule**: JSON path to calculated emission reduction value (without "document.credentialSubject.0." prefix)
* **tokenId**: UUID of the token template defined in policy configuration
* **accountType**:
  * `"default"`: Assigns tokens to policy owner (Standard Registry)
  * `"user"`: Assigns tokens to document submitter (Project Developer)

**Token Template Reference:** The `tokenId` must match a token defined in the policy's `policyTokens` array:

```json
{
  "policyTokens": [
    {
      "templateTokenTag": "VCU",
      "tokenName": "Verified Carbon Unit",
      "tokenSymbol": "VCU",
      "decimals": ""
    }
  ]
}
```

**VM0033 Integration:** VM0033 uses `automatic_report` customLogicBlock to calculate emission reductions, which outputs the `net_GHG_emissions_reductions_and_removals.NERRWE` field that the mint block references.

### tokenActionBlock: Token Operations

Handles token transfers, retirements, and account management.

**Configuration Pattern:**

```json
{
  "blockType": "tokenActionBlock",
  "tag": "transfer_tokens",
  "permissions": ["Project_Proponent"],
  "action": "transfer",
  "useTemplate": true
}
```

**Available Actions:**

* `"transfer"`: Move tokens between accounts
* `"freeze"`: Temporarily lock tokens
* `"unfreeze"`: Unlock frozen tokens
* `"grantKyc"`: Grant know-your-customer status
* `"revokeKyc"`: Revoke KYC status

### retirementDocumentBlock: Permanent Token Removal

Permanently removes tokens from circulation with retirement certificates.

**Configuration Pattern:**

```json
{
  "blockType": "retirementDocumentBlock",
  "tag": "retire_tokens",
  "permissions": ["Project_Proponent"],
  "templateTokenTag": "VCU",
  "rule": "document.credentialSubject.0.retirement_amount"
}
```

## Container and Navigation Blocks

These blocks organize user interfaces and manage workflow progression.

### interfaceContainerBlock: Layout Organization

Creates tabs, or a simple basic vertical layout for organizing workflow interfaces.

**Tab Container Pattern:**

```json
{
  "blockType": "interfaceContainerBlock",
  "tag": "main_container",
  "permissions": ["Project_Proponent"],
  "uiMetaData": {"type": "tabs"},
  "children": [
    {
      "tag": "projects_tab",
      "title": "My Projects"
    },
    {
      "tag": "reports_tab",
      "title": "Monitoring Reports"
    }
  ]
}
```

### policyRolesBlock: Role Assignment

Manages user role selection and assignment within policies.

**Configuration Pattern:**

```json
{
  "blockType": "policyRolesBlock",
  "tag": "choose_role",
  "permissions": ["NO_ROLE"],
  "roles": ["Project_Proponent", "VVB"],
  "uiMetaData": {
    "title": "Choose Your Role",
    "description": "Select your participation role in this methodology"
  }
}
```

### buttonBlock: Custom Actions

Creates buttons for state transitions and custom workflow actions. Used for approve/reject decisions with optional dialogs.

**VM0033 Real Configuration - Approve/Reject Buttons:**

```json
{
  "blockType": "buttonBlock",
  "tag": "approve_documents_btn",
  "permissions": ["OWNER"],
  "uiMetaData": {
    "buttons": [
      {
        "tag": "Button_0",
        "name": "Approve",
        "type": "selector",
        "field": "option.status",
        "value": "APPROVED",
        "uiClass": "btn-approve"
      },
      {
        "tag": "Button_1",
        "name": "Reject",
        "type": "selector-dialog",
        "title": "Reject",
        "description": "Enter reject reason",
        "field": "option.status",
        "value": "REJECTED",
        "uiClass": "btn-reject"
      }
    ]
  }
}
```

**Button Types:**

* **selector**: Simple button that sets a field value
* **selector-dialog**: Button with confirmation dialog for additional input

**Button Configuration Properties:**

* **tag**: Button identifier for event configuration (Button\_0, Button\_1, etc.)
* **field**: Document field to modify (typically "option.status")
* **value**: Value to set when button is clicked
* **uiClass**: CSS class for styling (btn-approve, btn-reject, etc.)
* **filters**: Array of conditions that control button visibility

**VM0033 Event Integration:**

```json
{
  "events": [
    {
      "target": "update_approve_document_status",
      "source": "approve_documents_btn",
      "input": "RunEvent",
      "output": "Button_0"
    },
    {
      "target": "update_approve_document_status_2",
      "source": "approve_documents_btn",
      "input": "RunEvent",
      "output": "Button_1"
    }
  ]
}
```

Each button output (Button\_0, Button\_1) can trigger different target blocks, allowing different workflows based on which button is clicked.

## Event Configuration Patterns

Events connect blocks together, creating automated workflows. Guardian provides both graphical and JSON-based event configuration.

### Visual Event Configuration

The Events tab provides an intuitive interface for connecting blocks:

![Guardian Events Tab Configuration](<../../../.gitbook/assets/image-4 (2).png>)

**Event Configuration Fields:**

* **Event Type**: Output Event (triggers when block completes)
* **Source**: Current Block (the triggering block)
* **Output Event**: RunEvent (completion trigger)
* **Target**: Next Block (destination block)
* **Input Event**: RunEvent (what the target block receives)
* **Event Actor**: Event Initiator (who can trigger this event)

### Basic Event Structure

```json
{
  "events": [
    {
      "source": "source_block_tag",
      "target": "destination_block_tag",
      "input": "RunEvent",
      "output": "RefreshEvent",
      "actor": "owner"
    }
  ]
}
```

### Common Event Patterns

**Document Submission Flow:**

```json
{
  "source": "new_project",
  "target": "save_new_project",
  "input": "RunEvent",
  "output": "RunEvent"
}
```

**UI Refresh After Save:**

```json
{
  "source": "save_new_project",
  "target": "project_grid",
  "input": "RefreshEvent",
  "output": "RunEvent"
}
```

## Advanced Block Configuration

### Dynamic Filtering with filtersAddon

Creates dynamic document filters based on status, date, or custom criteria.

**VM0033 Real Configuration:**

```json
{
  "blockType": "filtersAddon",
  "tag": "filter_project_grid_verra",
  "permissions": ["OWNER"],
  "uiMetaData": {
    "content": "Project Name"
  },
  "type": "dropdown",
  "queryType": "equal",
  "canBeEmpty": true,
  "field": "document.credentialSubject.0.project_details.G5",
  "optionName": "document.credentialSubject.0.project_details.G5",
  "optionValue": "document.credentialSubject.0.project_details.G5",
  "children": [
    {
      "blockType": "documentsSourceAddon",
      "dataType": "vc-documents",
      "schema": "#55df4f18-d3e5-4b93-af87-703a52c704d6",
      "filters": []
    }
  ]
}
```

**Key Configuration Properties:**

* **type**: Filter UI type - `"dropdown"` for select options, `"text"` for input fields
* **queryType**: Filter logic - `"equal"`, `"not_equal"`, `"contains"`, etc.
* **field**: Document field to filter on
* **optionName**: Field path for dropdown option labels
* **optionValue**: Field path for dropdown option values
* **canBeEmpty**: Whether filter allows empty/no selection

### Document Data Source with documentsSourceAddon

Provides filtered document collections to interfaceDocumentsSourceBlock parent containers.

**VM0033 Real Configuration:**

```json
{
  "blockType": "documentsSourceAddon",
  "tag": "project_grid_verra_waiting_to_add_projects",
  "permissions": ["OWNER"],
  "dataType": "vc-documents",
  "schema": "#55df4f18-d3e5-4b93-af87-703a52c704d6",
  "filters": [
    {
      "field": "option.status",
      "type": "equal",
      "value": "Waiting to be Added"
    },
    {
      "field": "type",
      "type": "equal",
      "value": "project"
    }
  ]
}
```

**Key Configuration Properties:**

* **dataType**: Document type - `"vc-documents"` for Verifiable Credentials, `"vp-documents"` for Verifiable Presentations
* **schema**: Schema UUID to filter documents by
* **filters**: Array of filter conditions to apply to document collection
* **onlyOwnDocuments**: Boolean - whether to show only user's own documents
* **defaultActive**: Boolean - whether this addon is active by default

**Filter Options:**

* **type**: `"equal"`, `"not_equal"`, `"contains"`, `"not_contains"`, `"in"`, `"not_in"`
* **field**: Document field path (e.g., `"option.status"`, `"document.credentialSubject.0.field1"`)
* **value**: Value or comma-separated values to filter by

## Block Configuration Best Practices

### Naming Conventions

Use unique, descriptive, consistent tag names:

* `new_project` for PDD submission blocks
* `save_project` for document storage blocks
* `project_grid_[role]` for role-specific grids
* `calculate_[type]` for calculation blocks

### Permission Design

Design permissions for least privilege:

* Document submission: Role-specific (`["Project_Proponent"]`)
* Document review: Authority roles (`["OWNER", "VVB"]`)
* Administrative functions: Registry only (`["OWNER"]`)

### Error Handling

Include validation and error handling blocks:

* Pre-validation before expensive operations
* Clear error messages for user guidance
* Fallback paths for edge cases

### Performance Optimization

Optimize for user experience:

* Use `onlyOwnDocuments: true` for large document sets
* Implement pagination for document grids
* Cache calculation results where appropriate

## Testing Your Block Configuration

### Configuration Validation

Test block configurations incrementally using Guardian's policy editor:

1. **Individual Block Testing**: Configure each block using Properties tab, verify JSON structure
2. **Event Chain Testing**: Use Events tab to connect blocks, test trigger flows
3. **Role Permission Testing**: Switch user roles to verify permission restrictions
4. **Data Flow Testing**: Submit test data through complete workflows using policy dry runs

**Guardian UI Testing Tips:**

* **Properties Tab**: Quick validation of basic settings and permissions
* **JSON Tab**: Verify complex configurations and nested structures
* **Events Tab**: Visual verification of workflow connections and event flows
* **Policy Preview**: Test complete workflows before publishing

### Common Configuration Issues

**Schema Reference Errors:**

* Verify schema UUIDs match your Part III schemas
* Check field path references in grids and calculations

**Permission Problems:**

* Ensure users have appropriate roles assigned
* Check `onlyOwnDocuments` settings for document visibility

**Event Connection Issues:**

* Verify source and target block tags match exactly
* Check event input/output types are compatible

## Integration with Part III Schemas

### Schema Field Mapping

Your Part III schemas become form fields and calculation variables:

**PDD Schema → Form Fields:**

```
Schema Field: "project_title" → Form Input: Text field with validation
Schema Field: "baseline_emissions" → Form Input: Number field with units
Schema Field: "monitoring_frequency" → Form Input: Dropdown selection
```

**Monitoring Schema → Calculation Variables:**

```javascript
// In customLogicBlock
const baseline = document.baseline_emissions_total;
const project = document.project_emissions_measured;
const leakage = document.leakage_emissions_calculated;
```

### Validation Rule Integration

Schema validation rules automatically apply to requestVcDocumentBlock forms:

* Required fields become mandatory
* Number ranges enforce min/max values
* Pattern validation ensures data format consistency
* Enum values create dropdown selections

## Next Steps and Chapter 15 Preview

Chapter 14 covered Guardian's workflow blocks and configuration patterns. You now understand how to:

* Configure data input blocks with your Part III schemas
* Set up calculation blocks for emission reduction formulas
* Create token management workflows for VCU issuance
* Design user interfaces with container and navigation blocks

**Chapter 15 Deep Dive**: Now that you understand individual blocks, Chapter 15 analyzes VM0033's complete policy implementation, showing how these blocks work together in a production methodology. You'll trace the complete workflow from PDD submission to VCU token issuance, understanding real-world policy patterns.

***

**Prerequisites Check:** Ensure you have:

* [ ] Completed Chapter 13 (Policy Architecture Understanding)
* [ ] Access to Guardian platform for hands-on block configuration
* [ ] Your Part III schemas with known UUIDs for integration
* [ ] VM0033.policy file for reference examples

**Time Investment**: \~30 minutes reading + \~90 minutes hands-on practice with block configuration

**Practical Exercises:**

1. **Visual Configuration Practice**: Use Guardian's Properties tab to configure a requestVcDocumentBlock with your Part III PDD schema
2. **Event Connection Practice**: Use the Events tab to connect form submission to document storage blocks
3. **JSON Configuration Practice**: Manually configure sendToGuardianBlock for both database and Hedera storage
4. **Complete Workflow Practice**: Create a simple project submission workflow using multiple block types and test with Guardian's policy preview
