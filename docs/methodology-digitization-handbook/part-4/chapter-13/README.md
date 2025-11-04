# Chapter 13: Policy Workflow Architecture and Design Principles

> Understanding Guardian's Policy Workflow Engine and connecting your Part III schemas to automated certification workflows

Part III gave you production-ready schemas. Chapter 13 transforms those static data structures into living, breathing policy workflows that automate your entire methodology certification process.

Guardian's Policy Workflow Engine (PWE) operates on a simple but powerful principle: connect modular blocks together to create sophisticated automation. Think of it like building with LEGO blocks, where each block serves a specific purpose but gains meaning through its connections with others.

## Guardian's Building Block Philosophy

### The Block-Event Architecture

Guardian policies work through **workflow blocks** that communicate via **events**. When a user submits a document, completes a calculation, or makes an approval decision, these actions trigger events that flow to other blocks, creating automated workflows.

```
User Action → Block Processing → Event Trigger → Next Block → Workflow Progression
```

VM0033 demonstrates this perfectly. For instance - when a Project Developer submits a PDD using a `requestVcDocumentBlock`, it triggers events that:
- Refresh the document grid for Standard Registry review
- Update project status to "Waiting to be Added" (Listing process)
- Enable VVB assignment workflow once registry accepts the listing

### Workflow Block Categories

Guardian provides four main block categories:

**Data Input and Management**: Collect and store information
- `requestVcDocumentBlock`: Generate forms from your Part III schemas
- `sendToGuardianBlock`: Save documents to database or Hedera blockchain
- `interfaceDocumentsSourceBlock`: Display document grids with filtering capabilities

**Logic and Calculation**: Process and validate data
- `customLogicBlock`: Execute JavaScript or Python calculations for emission reductions
- `documentValidatorBlock`: Validate data against your methodology rules
- `switchBlock`: Create conditional workflow branches

**Token and Asset Management**: Handle credit issuance - retirement lifecycle
- `mintDocumentBlock`: Issue VCUs(tokens) based on verified emission reductions or removals
- `tokenActionBlock`: Transfer, retire, or manage existing tokens
- `retirementDocumentBlock`: Permanently remove tokens from circulation

**Container and Navigation**: Organize user experience
- `interfaceContainerBlock`: Create tabs, steps, and layouts
- `policyRolesBlock`: Manage user role assignment
- `buttonBlock`: Add custom actions and state transitions

## From Part III Schemas to Policy Workflows

Your schemas become the foundation for workflow automation. Here's how they connect:

### Schema UUID Integration

Each schema from Part III has a unique UUID that becomes a reference in policy blocks:

```json
{
  "blockType": "requestVcDocumentBlock",
  "schemaId": "#9122bbd0-d96e-40b1-92f6-7bf60b68137c",
  "uiMetaData": {
    "title": "Project Design Document",
    "description": "Submit your PDD for validation"
  }
}
```

That schema UUID (`#9122bbd0-d96e-40b1-92f6-7bf60b68137c`) is your PDD schema from Part III. Guardian automatically generates a form with all your schema fields, validation rules, and input types.

### Field Key Mapping

Schema field keys become variables in calculation blocks:

```javascript
// Your Part III schema field: "baseline_emissions_tCO2e"
// Becomes a JavaScript variable in customLogicBlock:
const baselineEmissions = document.baseline_emissions_tCO2e;
const projectEmissions = document.project_emissions_tCO2e;
const netReductions = baselineEmissions - projectEmissions;
```

### Validation Rule Translation

Schema validation rules automatically enforce data quality:
- Required fields become mandatory form inputs
- Number ranges become input validation
- Enum values become dropdown selections
- Pattern matching ensures data format consistency

## Role-Based Workflow Design

Environmental methodologies require clear stakeholder separation. Guardian implements this through role-based access control:

### Standard Stakeholder Roles

**OWNER (Standard Registry)**
- Manages the overall certification program and policy
- Approves VVBs and validates projects
- Authorizes token minting(issuance)
- Review all documentation received from developer or VVB, request clarifications
- Maintains audit trails and program integrity

**Project_Proponent (Project Developer)**
- Submits PDDs and monitoring reports
- Assigns VVBs for validation/verification
- Receives carbon credits(minted tokens) upon successful verification
- Tracks project status and documentation

**VVB (Validation and Verification Body)**
- Registers as independent auditor
- Validates project submissions
- Verifies monitoring reports
- Submits validation/verification reports

### Document Access Patterns

Each role sees different views of the same data:

```json
{
  "permissions": ["Project_Proponent"],
  "onlyOwnDocuments": true
}
```

Project Developers only see their own projects, while Standard Registry sees all projects for oversight. VVBs see projects assigned to them for validation/verification.

## Event-Driven Workflow Patterns

Traditional workflows are linear: Step 1 → Step 2 → Step 3. Guardian workflows are event-driven, allowing flexible, responsive automation.

### Event Types and Flow

**RunEvent**: Triggered when a block completes
**RefreshEvent**: Updates UI displays and document grids
**TimerEvent**: Time-based triggers for deadlines or schedules
**ErrorEvent**: Handles validation failures and error recovery

VM0033 shows sophisticated event patterns:

```json
{
  "source": "add_project",
  "target": "save_added",
  "input": "RunEvent",
  "output": "Button_0"
}
```

When a Project Developer clicks "Add Project" (`Button_0` output), it triggers the `save_added` block, which stores the project and refreshes the interface.

### Multi-Path Workflows

Events enable conditional branching. A VVB's validation decision creates different event paths:

```
Validation Decision → Approved Path: Project Listing + Monitoring Setup
                  → Rejected Path: Developer Notification + Revision Request
```

This flexibility mirrors real-world certification processes where outcomes depend on validation results, not predetermined sequences.

## VM0033 Architecture Patterns

VM0033's production policy demonstrates proven architecture patterns worth understanding:

### Three-Tier Stakeholder Design

**Tier 1: Registration and Setup**
- VVB registration and approval
- Project listing and initial review
- Role assignment and permissions setup

**Tier 2: Validation and Verification**
- Project validation workflows
- Monitoring report submission and verification
- Document review and approval processes

**Tier 3: Token Management and Audit**
- Emission reduction calculation and validation
- VCU token minting based on verified results
- Trust chain generation and audit trail creation

### Document State Management

VM0033 tracks document states throughout the certification lifecycle:

```
Draft → Submitted → Under Review → Approved/Rejected → Published → Minted
```

Each state transition triggers appropriate events, adds status values, notifications, and access control changes.

## Practical Implementation Strategy

{% hint style="success" %}
**Reuse Rather Than Rebuild**: Instead of creating policies from scratch, import existing policies like VM0033, remove their schemas, add your Part III schemas, and modify the workflow logic. This approach saves weeks of development time and provides proven workflow patterns as your foundation.

To reuse VM0033: Import the policy → Delete existing schemas → Import your Part III schemas → Update schema IDs at relevant places with bulk find and replace → Modify token minting rules → Test with your data.
{% endhint %}

### Start with Document Flow

Begin by mapping your methodology's document flow:
1. What documents need submission? (PDD, monitoring reports)
2. Who reviews each document? (Registry, VVBs)
3. What approvals are required? (Validation, verification)
4. When are tokens minted? (After verification approval)

### Schema Integration Planning

Map your Part III schemas to workflow purposes:
- **PDD Schema**: Project submission and validation workflow
- **Monitoring Schema**: Ongoing reporting and verification workflow
- **Validation Report Schema**: VVB validation documentation
- **Verification Report Schema**: VVB verification documentation

### Calculation Integration Strategy

Your Part III schemas contain calculation fields that become variables in `customLogicBlock`:

```javascript
// Emission reduction calculation using schema field keys
const calculateEmissionReductions = (pddData, monitoringData) => {
  const baseline = pddData.baseline_emissions_total;
  const project = monitoringData.project_emissions_measured;
  const leakage = monitoringData.leakage_emissions_calculated;

  return baseline - project - leakage;
};
```

The calculation results would feeds directly into schemas to be reviewed by VVB/Registry and later accessed via `mintDocumentBlock` for VCU issuance.

## Development Workflow

### Phase 1: Architecture Planning
- Map stakeholder roles and permissions
- Design document flow and state transitions
- Plan event connections between workflow blocks
- Identify calculation requirements and token minting rules

### Phase 2: Block Configuration
- Configure data input blocks with Part III schemas
- Set up calculation blocks with methodology formulas
- Create container blocks for user interface organization
- Connect blocks through event definitions

### Phase 3: Testing and Refinement
- Test complete workflows with sample data
- Validate calculations against Part III test artifacts
- Refine user interfaces and error handling
- Optimize performance and user experience

## User Roles and Permissions Management

🚧 **Work in Progress** - This section covers Guardian's role-based access control and user management features.

### Stakeholder Role Definition

Guardian uses roles to separate users into different stakeholder types with specific workflow permissions. In VM0033 implementation, three primary roles manage the certification workflow:

**Standard Registry (Admin)**
- Creates and publishes methodology policies
- Oversees project registration and validation oversight
- Manages VVB accreditation and user permissions
- Controls token minting and registry operations

**VVB (Validation and Verification Body)**
- Conducts independent project validation
- Performs monitoring report verification
- Submits validation and verification reports
- Acts as trusted third-party auditor

**Project Developer (Project Proponent)**
- Submits project design documents (PDDs)
- Provides monitoring reports and supporting documentation
- Manages project implementation and reporting
- Receives issued carbon credits (VCUs)

### Role Configuration in Policy Configurator

Roles are created using Guardian's Policy Configurator interface by adding Role Properties:

1. **Role Creation**: Add Role Property in policy configuration
2. **Role Assignment**: Set role values for different stakeholder types
3. **Permission Mapping**: Configure block-level permissions based on roles
4. **Access Control**: Limit workflow block visibility and API access per role

### Block-Level Permissions

Guardian workflow blocks include permission settings that control:
- Which roles can view and interact with each block
- API endpoint access control per stakeholder type
- Document submission and approval permissions
- Event propagation based on user roles

**Example Permission Configuration:**
```json
{
  "blockType": "requestVcDocumentBlock",
  "permissions": ["Project_Proponent"],
  "tag": "pdd_submission_block"
}
```

This configuration allows only Project Proponents to submit PDDs through this specific workflow block.

### Groups and Multi-User Management

Guardian supports Groups for managing document access and collaboration:

**Group Types:**
- **Single**: One user per group (legacy compatibility)
- **Multiple**: Multiple users can collaborate within groups

**Access Types:**
- **Global**: Static groups created at policy start
- **Private**: Dynamic groups created by users during workflow execution

**Document Filtering:**
Groups enable sophisticated document filtering through `documentsSourceAddon`:
- **Owned by User**: Documents created by current user
- **Owned by Group**: Documents created within current group
- **Combined Filtering**: User-specific documents within group context

🚧 **Detailed Implementation**: Complete user management configuration patterns and group setup procedures will be covered in expanded sections.

## Key Takeaways

Guardian's Policy Workflow Engine transforms static schemas into dynamic certification workflows. The event-driven architecture provides flexibility while maintaining audit trails and stakeholder separation.

VM0033 offers a proven template for environmental methodology automation. Rather than building from scratch, leverage existing patterns and focus your effort on methodology-specific calculations and business rules.

Part III schemas integrate seamlessly with policy workflows. Schema UUIDs become block references, field keys become calculation variables, and validation rules become workflow automation.

---

**Next Steps**: Chapter 14 explores Guardian's 25+ workflow blocks in detail, showing step-by-step configuration for data collection, calculations, and token management using VM0033's production examples.

**Prerequisites Check**: Ensure you have:
- [ ] Completed Part III with production-ready schemas
- [ ] Access to Guardian platform for hands-on practice
- [ ] VM0033.policy file for reference and reuse
- [ ] Understanding of your methodology's stakeholder workflow

**Time Investment**: ~25 minutes reading + ~60 minutes hands-on practice with Guardian policy architecture and planning