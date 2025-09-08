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

## Part V: Calculation Logic Implementation

### Chapter 17: Custom Logic Block Development

**Purpose**: Implement complex calculation logic using JavaScript in Guardian.

**Key Topics**:

* JavaScript/Python development environment setup
* Guardian calculation block architecture
* Input/output document handling
* Mathematical operations and precision handling
* Error handling and validation
* Performance optimization techniques
* Debugging and testing strategies

**VM0033 Context**: Complete implementation of VM0033 emission reduction calculations, including baseline emissions, project emissions, and net emission reductions.

### Chapter 18: Formula Linked Definitions (FLDs)

**Purpose**: Implement complex parameter relationships and dependencies.

**Key Topics**:

* FLD concept and architecture
* Parameter linking and dependency management
* Dynamic calculation updates
* Circular dependency detection and resolution
* Performance implications of complex FLDs
* Documentation and maintenance strategies

**VM0033 Context**: Implementation of VM0033's complex parameter relationships, including soil organic carbon calculations and biomass estimations.

### Chapter 19: Data Validation and Error Handling

**Purpose**: Ensure data quality and system reliability through robust validation.

**Key Topics**:

* Input validation strategies and techniques
* Business rule validation implementation
* Error message design and user feedback
* Data sanitization and security considerations
* Graceful error recovery mechanisms
* Logging and monitoring for validation issues

**VM0033 Context**: Comprehensive validation rules for VM0033 data inputs, including range checks, consistency validations, and methodology-specific business rules.

### Chapter 20: Calculation Testing and Verification

**Purpose**: Validate calculation accuracy against test artifacts and methodology requirements.

**Key Topics**:

* Unit testing for calculation functions
* Integration testing with complete workflows
* Test data generation and management
* Performance testing for large datasets
* Regression testing for methodology updates

**VM0033 Context**: Complete testing suite for VM0033 calculations, comparing results against manually calculated test cases and methodology examples.

## Part VI: Integration and Testing

### Chapter 21: End-to-End Policy Testing

**Purpose**: Validate complete policy functionality across all user roles and scenarios.

**Key Topics**:

* Test scenario design and coverage analysis
* Multi-role testing strategies
* Workflow testing and state validation
* Data integrity testing across the complete flow
* User acceptance testing coordination
* Performance and load testing

**VM0033 Context**: Comprehensive end-to-end testing of VM0033 policy, including multiple project types and restoration scenarios.

### Chapter 22: API Integration and Automation

**Purpose**: Leverage Guardian APIs for testing, integration, and automation.

**Key Topics**:

* Guardian API architecture and authentication
* Automated data submission and workflow execution
* Integration with external monitoring systems
* Bulk data processing and batch operations
* API testing and validation strategies
* Error handling and retry mechanisms

**VM0033 Context**: API-based automation for VM0033 data submission, including PDD registration and monitoring report submission.

## Part VII: Deployment and Maintenance

### Chapter 23: User Management and Role Assignment

**Purpose**: Set up and manage users, roles, and permissions for deployed methodologies.

**Key Topics**:

* User onboarding and account management
* Role assignment and permission configuration
* Organization management and multi-tenancy
* Access control and security policies
* User training and support procedures
* Audit and compliance reporting

**VM0033 Context**: User management for VM0033 implementation, including VVB accreditation, project developer registration, and Verra administrator roles.

### Chapter 24: Monitoring and Analytics - Guardian Indexer

**Purpose**: Monitoring and analytics for deployed methodologies and data submitted via Indexer

**Key Topics**:

* Usage analytics and reporting
* Data export and reporting capabilities
* Compliance monitoring and audit trails

**VM0033 Context**: Viewing all data on Indexer, tracking project registrations, credit issuances

### Chapter 25: Maintenance and Updates

**Purpose**: Maintain and evolve deployed methodologies over time.

**Key Topics**:

* Maintenance procedures and schedules
* Bug fixing and issue resolution
* Methodology updates and regulatory changes
* User feedback integration and feature requests
* Long-term support and lifecycle planning

**VM0033 Context**: Maintenance strategy for VM0033 implementation, including handling Verra methodology updates and regulatory changes.

## Part VIII: Advanced Topics and Best Practices

### Chapter 26: Integration with External Systems

**Purpose**: Connect Guardian-based methodologies with external systems and services.

**Key Topics**:

* External system integration patterns
* Data transformation via blocks
* Data synchronization and consistency
* Real-time data feeds and streaming (Metered Policy Example)

**VM0033 Context**: Integration of VM0033 with external monitoring systems, satellite data feeds, and Verra's registry systems.

### Chapter 27: Troubleshooting and Common Issues

**Purpose**: Provide solutions for common problems encountered during methodology digitization.

**Key Topics**:

* Common digitization pitfalls and solutions
* Debugging techniques and tools
* Data quality issues and resolution
* User experience problems and fixes
* Integration and compatibility issues

**VM0033 Context**: Some specific troubleshooting scenarios encountered during VM0033 implementation and their solutions.

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
