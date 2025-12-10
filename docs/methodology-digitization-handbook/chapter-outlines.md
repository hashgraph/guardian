# 📝 Chapter Outlines

## Part I: Foundation and Preparation

### [Chapter 1: Introduction to Methodology Digitization](part-1/chapter-1/README.md)
**Purpose**: Establish the foundation for understanding methodology digitization on Guardian platform.

**Key Topics**:

* What is methodology digitization and why it matters
* Guardian platform's role in environmental asset tokenization
* Overview of the digitization process from PDF to working policy
* VM0033 as our reference case study - why it was chosen
* Benefits of digitization: transparency, efficiency, automation
* Common challenges and how this handbook addresses them
* Setting up your development environment

**VM0033 Context**: Introduction to VM0033's significance in blue carbon markets and its complexity as a comprehensive tidal wetland restoration methodology.

### [Chapter 2: Understanding VM0033 Methodology](part-1/chapter-2/README.md)
**Purpose**: Provide deep domain knowledge of VM0033 before beginning technical implementation.

**Key Topics**:

* VM0033 scope and applicability conditions
* Baseline scenario determination for tidal wetlands
* Project activities and intervention types
* Key stakeholders and their roles in wetland restoration
* Emission sources and carbon pools covered
* Monitoring requirements and verification processes
* Relationship to other VCS methodologies and CDM tools

**VM0033 Context**: Complete walkthrough of the methodology document structure, highlighting sections that will be digitized and their interdependencies.

### [Chapter 3: Guardian Platform Overview for Methodology Developers](part-1/chapter-3/README.md)
**Purpose**: Provide methodology developers with Guardian-specific knowledge needed for digitization.

**Key Topics**:

* Guardian architecture: services, APIs, and data flow
* Policy Workflow Engine (PWE) fundamentals
* Schema system and Verifiable Credentials
* Hedera Hashgraph integration and immutable records
* User roles and permissions model
* IPFS integration for document storage
* Guardian UI components and user experience

**VM0033 Context**: How VM0033's complexity maps to Guardian's capabilities and architectural patterns.

## Part II: Analysis and Planning

### Chapter 4: Methodology Analysis and Decomposition

**Purpose**: Teach systematic approach to analyzing methodology documents for digitization.

**Key Topics**:

* Structured reading techniques for methodology PDFs
* Identifying workflow stages and decision points
* Mapping stakeholder interactions and document flows
* Extracting data requirements and validation rules
* Understanding temporal boundaries and crediting periods
* Identifying calculation dependencies and parameter relationships

**VM0033 Context**: Step-by-step analysis of VM0033 document, breaking down its content into digestible components and identifying digitization priorities.

### Chapter 5: Equation Mapping and Parameter Identification

**Purpose**: Master the process of extracting and organizing all mathematical components of a methodology.

**Key Topics**:

* Recursive equation analysis starting from final emission reduction formula
* Parameter classification: monitored vs. non-monitored vs. user-input
* Building parameter dependency trees
* Identifying default values and lookup tables
* Handling conditional calculations and alternative methods
* Creating calculation flowcharts and documentation

**VM0033 Context**: Complete mapping of VM0033's emission reduction equations, including baseline emissions, project emissions, and leakage calculations with all parameter dependencies.

### Chapter 6: Tools and Modules Integration

**Purpose**: Handle external tools and modules that methodologies reference.

**Key Topics**:

* Understanding CDM tools and VCS modules
* Integrating AR-Tool14 for biomass calculations
* Incorporating VMD modules for specific calculations
* Handling tool versioning and updates
* Creating unified calculation frameworks
* Managing tool dependencies and conflicts

**VM0033 Context**: Integration of subset of tools referenced in VM0033, limited to AR-Tool05, AR-Tool14, AFLOU Non permanence risk tool.

### Chapter 7: Test Artifact Development

**Purpose**: Create comprehensive test cases that validate the digitized methodology.

**Key Topics**:

* Designing test scenarios covering all methodology pathways
* Creating input parameter datasets for testing
* Establishing expected output benchmarks
* Building validation spreadsheets with all calculations
* Documenting test cases and acceptance criteria
* Version control for test artifacts

**VM0033 Context**: Development of complete VM0033 test spreadsheet with multiple project scenarios, covering different wetland types, restoration activities, and calculation methods.

## Part III: Schema Design and Development

### Chapter 8: Schema Architecture and Foundations

**Purpose**: Understand Guardian's schema system fundamentals and architectural patterns.

**Key Topics**:

* Guardian's JSON Schema integration with Verifiable Credentials
* Two-part schema architecture (Project Description + Calculations)
* Field type selection and parameter mapping principles
* Schema template structure and organization
* Basic conditional logic and field visibility
* Performance considerations for schema design

**VM0033 Context**: VM0033's two-part architecture demonstrating how complex wetland restoration methodology translates into Guardian schema structure with 400+ components.

### Chapter 9: Project Design Document (PDD) Schema Development

**Purpose**: Build comprehensive PDD schemas using Excel-first approach with step-by-step implementation.

**Key Topics**:

* Excel schema template usage and structure
* Step-by-step PDD schema construction process
* Conditional logic implementation with enum selections
* Sub-schema creation and organization
* Field key management for calculation code readability
* Guardian import process and testing

**VM0033 Context**: Complete walkthrough of building VM0033 PDD schema from Excel template, including certification pathway conditionals and calculation parameter capture.

### Chapter 10: Monitoring Report Schema Development

**Purpose**: Create time-series monitoring schemas that handle annual data collection and calculation updates.

**Key Topics**:

* Temporal data structures for monitoring periods
* Annual parameter tracking and time-series organization
* Quality control fields and evidence documentation
* Field key management for time-series calculations
* VVB verification workflow support
* Integration with PDD schema parameters

**VM0033 Context**: VM0033 monitoring schema development covering herbaceous vegetation monitoring, carbon stock tracking, and temporal boundary management over 100-year crediting periods.

### Chapter 11: Advanced Schema Techniques

**Purpose**: Master API schema management, field properties, and advanced Guardian features.

**Key Topics**:

* API-based schema operations and updates
* Field key naming best practices for calculation code
* Standardized Property Definitions from GBBC specifications
* Four Required field types: None, Hidden, Required, Auto Calculate
* Schema UUID management for efficient development
* Bulk operations and version control strategies

**VM0033 Context**: Advanced schema management techniques used in VM0033 development, including Auto Calculate field implementation for equation results and UUID management for policy integration.

### Chapter 12: Schema Testing and Validation Checklist

**Purpose**: Validate schemas using Guardian's testing features before deployment.

**Key Topics**:

* Default Values, Suggested Values, and Test Values configuration
* Schema preview testing and functionality validation
* UUID integration into policy workflow blocks
* Test artifact completeness checking
* Field validation rules and user experience optimization
* Pre-deployment checklist and user testing

**VM0033 Context**: Practical testing approach used for VM0033 schema validation, including systematic testing of conditional logic and calculation field behavior.

## Part IV: Policy Workflow Design

### Chapter 13: Policy Workflow Architecture and Design Principles

**Purpose**: Establish foundational understanding of Guardian policy architecture and design patterns for environmental methodology implementation.

**Key Topics**:

* Guardian policy architecture fundamentals and component overview
* Event-driven workflow block communication system
* Policy lifecycle management and versioning strategies
* Hedera blockchain integration for immutable audit trails
* Document flow design patterns and state management
* Security considerations and access control architecture

**VM0033 Context**: Guardian policy architecture analysis using VM0033 production implementation as reference for tidal wetland restoration methodology digitization.

### Chapter 14: Guardian Workflow Blocks and Configuration

**Purpose**: Master Guardian's workflow block system for building environmental certification workflows.

**Key Topics**:

* interfaceDocumentsSourceBlock for document management and filtering
* buttonBlock configurations for user interactions and workflow transitions
* requestVcDocumentBlock for data collection and schema integration
* sendToGuardianBlock for data persistence and blockchain storage
* Role-based permissions and access control implementation
* Event-driven communication between workflow blocks

**VM0033 Context**: Complete workflow block configuration using VM0033 production policy JSON, covering project submission, VVB approval, and document management workflows.

### Chapter 15: VM0033 Implementation Deep Dive

**Purpose**: Deep technical analysis of VM0033 policy implementation using actual Guardian production configurations.

**Key Topics**:

* VVB document approval workflow with real JSON configurations
* Project submission and review processes using Guardian blocks
* Role-based workflow analysis (Project_Proponent, VVB, Owner)
* Document filtering and status management implementations
* Button configuration patterns for workflow transitions
* End-to-end integration patterns and event routing

**VM0033 Context**: Complete analysis of VM0033 production policy JSON with extracted block configurations, focusing on real-world implementation patterns for tidal wetland restoration certification.

### Chapter 16: Advanced Policy Patterns

**Purpose**: Advanced Guardian policy implementation patterns using production VM0033 configurations.

**Key Topics**:

* Transformation blocks for external API integration (Verra project hub)
* Document validation blocks for data integrity and business rule enforcement
* External data integration patterns (Kanop satellite monitoring, IoT devices)
* Policy testing frameworks including dry-run mode and programmatic testing
* Demo mode configuration for training and development environments
* Production deployment patterns and error handling strategies

**VM0033 Context**: Real implementation examples from VM0033 production policy including dataTransformationAddon for Verra API integration, documentValidatorBlock configurations, and comprehensive testing approaches.

## ✅ Part V: Calculation Logic Implementation

### Chapter 17: (Reserved for Part IV completion)

**Purpose**: Reserved for additional Part IV content.

### Chapter 18: Custom Logic Block Development

**Purpose**: Implement emission reduction calculations using JavaScript in Guardian's customLogicBlock.

**Key Topics**:

* Guardian customLogicBlock architecture and JavaScript execution environment
* Document input/output handling with credentialSubject field access
* VM0033 baseline emissions, project emissions, and net emission reduction calculations
* Schema field integration and Auto Calculate field implementation
* Error handling and validation within calculation blocks
* Testing calculation logic outside and within Guardian environment

**VM0033 Context**: Complete implementation of VM0033 emission reduction calculations using real production JavaScript from er-calculations.js artifact, including field mapping to PDD and monitoring report schemas.

### Chapter 19: Formula Linked Definitions (FLDs)

**Purpose**: Brief foundation chapter establishing FLD concepts for parameter relationship management in Guardian methodologies.

**Key Topics**:

* FLD concept and basic architectural understanding
* Parameter reuse across multiple schema documents in policy workflows 
* VM0033 parameter relationship examples suitable for FLD implementation
* Integration patterns with customLogicBlock calculations
* Basic design principles for FLD frameworks

**VM0033 Context**: Concise overview establishing FLD concepts with VM0033 parameter relationship examples, focusing on foundational understanding rather than detailed implementation.

### Chapter 20: Guardian Tools Architecture and Implementation

**Purpose**: Build Guardian Tools using extractDataBlock and customLogicBlock patterns, with AR Tool 14 as practical example.

**Key Topics**:

* Guardian Tools architecture as mini-policies with three-block pattern
* ExtractDataBlock workflows for schema-based data input/output operations
* CustomLogicBlock integration for standardized calculation implementations
* AR Tool 14 complete implementation with stratified random sampling
* Tool versioning, schema evolution, and production deployment patterns
* Tool integration patterns for use across multiple methodologies

**VM0033 Context**: Real AR Tool 14 implementation from Guardian production artifacts showing complete biomass calculation tool that integrates with VM0033 wetland restoration methodology.

### Chapter 21: Calculation Testing and Validation

**Purpose**: Comprehensive testing using Guardian's dry-run mode and customLogicBlock testing interface with VM0033 and AR Tool 14 test artifacts.

**Key Topics**:

* Guardian's customLogicBlock testing interface with three input methods (schema-based, JSON editor, file upload)
* Interactive testing and debugging with Guardian's built-in debug() function
* Dry-run mode for complete policy workflow testing without blockchain transactions
* Test artifact validation using final-PDD-vc.json and official methodology spreadsheets
* Testing at every calculation stage: baseline, project, leakage, and net ERR
* API-based automated testing using Guardian's REST APIs and Cypress framework
* Best practices for test data management and systematic testing approaches

**VM0033 Context**: Practical testing implementation using VM0033_Allcot_Test_Case_Artifact.xlsx and final-PDD-vc.json with Guardian's testing interface, demonstrating complete validation workflow from individual calculations to full policy testing.

## Part VI: Integration and Testing

### Chapter 22: End-to-End Policy Testing

**Purpose**: Testing complete methodology workflows across all stakeholder roles using Guardian's dry-run capabilities and VM0033 production patterns.

**Key Topics**:

* Multi-role testing framework with virtual user management
* Complete stakeholder workflow simulation (Project Proponent, VVB, Standard Registry)
* VM0033 workflow testing using policy navigation structure and role transitions
* Production-scale data validation with large datasets and multi-year monitoring periods
* Cross-component integration testing validating schema-workflow-calculation consistency
* Guardian dry-run artifacts and validation procedures for methodology compliance

**VM0033 Context**: Complete end-to-end testing using VM0033 policy structure, demonstrating multi-stakeholder workflows from PDD submission through VCU token issuance with role-based testing scenarios.

### Chapter 23: API Integration and Automation

**Purpose**: Automating methodology operations using Guardian's REST API framework for production deployment and integration.

**Key Topics**:

* Guardian API authentication patterns with JWT tokens and refresh token management
* VM0033 policy block API structure using real block IDs for PDD and monitoring report submission
* Dry-run API operations with virtual user creation and management for automated testing
* Automated workflow execution class demonstrating complete VM0033 project lifecycle via APIs
* Cypress testing integration for automated methodology validation and regression testing

**VM0033 Context**: Practical API automation using VM0033 policy endpoints, demonstrating automated data submission, virtual user workflows, and production API patterns for scalable methodology operations.


### Chapter 24: Guardian Indexer for Methodology Analytics

**Purpose**: Deploy and configure Guardian Indexer for comprehensive methodology analytics, monitoring, and compliance reporting.

**Key Topics**:

* Guardian Indexer installation and configuration with Docker
* Global search capabilities across all Guardian instances and methodology data
* VM0033 project lifecycle tracking and performance analytics
* Priority loading system for important datasets
* Compliance monitoring and automated audit trail generation
* API integration and external system connectivity

**VM0033 Context**: Using Guardian Indexer to monitor VM0033 tidal wetland restoration projects, track VCU credit issuances, and generate compliance reports for Verra registry requirements.

## Part VII: Advanced Topics and Best Practices

### Chapter 25: Integration with External Systems

**Purpose**: Implement bidirectional data exchange between Guardian and external platforms.

**Key Topics**:

* Data transformation using dataTransformationAddon blocks with JavaScript
* VM0033 production transformation code for external registry integration
* External data reception using externalDataBlock and MRV configuration patterns
* Metered energy policy patterns for automated monitoring data collection

**VM0033 Context**: VM0033's dataTransformationAddon block implementation for Verra Project Hub integration and MRV sender patterns for external monitoring data collection.

### Chapter 26: Troubleshooting and Common Issues

**Purpose**: Practical tips and solutions for common problems encountered during methodology digitization.

**Key Topics**:

* Schema building best practices and Excel import pitfalls
* Development workflow optimization using savepoints and API testing
* Custom logic block testing and document history debugging
* Event troubleshooting when documents don't appear in UI
* Performance optimization and calculation precision issues

**VM0033 Context**: Real-world troubleshooting tips from Guardian methodology development experience, focusing on practical solutions to save development time.

***

## Implementation Notes

Each chapter will include:

* **Practical Examples**: Real code, configurations, and screenshots from VM0033 implementation
* **Best Practices**: Lessons learned and recommended approaches
* **Common Pitfalls**: What to avoid and how to prevent issues
* **Testing Strategies**: How to validate each component
* **Performance Considerations**: Optimization tips and scalability guidance
* **Maintenance Notes**: Long-term considerations and update strategies

The handbook is designed to be both a learning resource and a reference guide, with clear navigation between conceptual understanding and practical implementation.
