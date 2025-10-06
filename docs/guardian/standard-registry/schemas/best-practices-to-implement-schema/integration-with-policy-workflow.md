# Integration with Policy Workflow

Best practices for Integration with Policy Workflow in Hedera Guardian focus on aligning schema design and data capture directly with the Guardian Policy Workflow Engine (PWE) to enable automated, auditable, and role-based process management.

### Key Best Practices

* **Schema-Driven Workflow Blocks**\
  Design schemas to feed directly into Guardian’s workflow blocks like InterfaceStepBlock, requestVCDocumentBlock, and sendToGuardianBlock, enabling seamless generation, validation, and transmission of verifiable credentials (VCs) and presentations (VPs) within policies.
* **Role-Based Permissions**\
  Define and integrate roles (e.g., Standard Registry Admin, User, Auditor) aligned with schema access and workflow steps. Attach these roles to specific workflow blocks to enforce approval, editing, or auditing capabilities based on responsibility.
* **Modular and Composable Workflows**\
  Build workflows as modular blocks that can be combined or rearranged easily. Each block handles distinct tasks like data capture, multi-signature collection, token minting, or notifications, facilitating flexible policy automation.
* **Clear Data Type and Structure Alignment**\
  Ensure the data types defined in schemas (e.g., “Hedera” for VC documents) are compatible with policy actions that send or store data permanently on Hedera. This alignment prevents runtime errors and supports on-chain verification integrity.
* **Workflow Step Sequencing and Dependencies**\
  Configure policy action steps sequentially (e.g., capture form data → validate → send VC to Hedera → issue tokens) so that transitions occur logically and data integrity is preserved through the lifecycle.
* **Automated Credential Issuance and Storage**\
  Integrate schema outputs with policy workflows to automate Verifiable Credential creation, signing, and recording on the Hedera Consensus Service (HCS) topics, enabling immutable audit trails and real-time discoverability.
* **Integration with External Systems**\
  Use HTTP Request Blocks or API integrations in workflows to connect with third-party services or databases, feeding external data into Guardian workflows or pushing Guardian outputs into enterprise systems.
* **User Experience Optimization**\
  Use InterfaceContainerBlocks and InterfaceStepBlocks to organize schema-driven forms with conditional logic, progress bars, notifications, and informative messages, making workflows clear and user-friendly.
* **Testing and Iteration**\
  Test each workflow step independently and in sequence. Use Guardian’s preview and simulation tools to validate data capture, rule enforcement, role permissions, and blockchain interactions before going live.
* **Documentation and Training**\
  Maintain comprehensive policy workflow documentation aligned with schema definitions, detailing role responsibilities, step sequences, data inputs/outputs, and integration points to support users and developers.
