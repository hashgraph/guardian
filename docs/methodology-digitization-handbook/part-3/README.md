# 🏗️ Part III: Schema Design and Development

> Practical schema development using Excel-first approach and Guardian's schema management features

Part III transforms your methodology analysis from Part II into working Guardian schemas through hands-on, step-by-step implementation. Using VM0033 as a concrete example, this section teaches practical schema development from architectural foundations through testing and validation.

The five chapters follow a logical progression: Guardian schema basics → PDD schema development → monitoring schema development → advanced schema management techniques → practical testing checklist.

## Schema Development Approach

Part III focuses on practical schema development using proven patterns from VM0033 implementation. Rather than theoretical concepts, each chapter provides step-by-step instructions for creating working schemas that capture methodology requirements accurately.

**Development Sequence**:

1. **Schema Architecture Foundations** (Chapter 8): Guardian schema system basics and field mapping principles
2. **PDD Schema Development** (Chapter 9): Approach to building comprehensive PDD schemas step-by-step
3. **Monitoring Schema Development** (Chapter 10): Time-series monitoring schemas with temporal data management
4. **Advanced Schema Techniques** (Chapter 11): API schema management, field properties, Required types, and UUIDs
5. **Schema Testing Checklist** (Chapter 12): Practical validation steps using Guardian's testing features

This hands-on approach ensures you can build production-ready schemas while understanding Guardian's schema management capabilities.

## Chapter Progression and Learning Objectives

### [Chapter 8: Schema Architecture and Foundations](chapter-8/)

**Focus**: Guardian schema system fundamentals and the two-part architecture pattern used in VM0033.

**What You'll Learn**: Guardian's JSON Schema integration, Verifiable Credentials structure, and the proven two-part architecture (Project Description + Calculations) that handles methodology complexity. You'll understand how to map methodology parameters to Guardian field types.

**Practical Skills**: Field type selection, parameter mapping, and architectural patterns that simplify complex methodologies into manageable schema structures.

### [Chapter 9: Project Design Document (PDD) Schema Development](chapter-9/)

**Focus**: Step-by-step Excel-first approach to building comprehensive PDD schemas.

**What You'll Learn**: Complete PDD schema development process from Excel template through Guardian import. Includes conditional logic implementation, sub-schema creation, and essential field key management for calculation code readability.

**Practical Skills**: Excel schema template usage, Guardian field configuration, conditional visibility logic, and proper field key naming for maintainable calculation code.

### [Chapter 10: Monitoring Report Schema Development](chapter-10/)

**Focus**: Time-series monitoring schemas that handle annual data collection and calculation updates.

**What You'll Learn**: Monitoring schema development with temporal data structures, quality control fields, and evidence documentation. Covers field key management specific to time-series calculations and VVB verification workflows.

**Practical Skills**: Annual parameter tracking, temporal data organization, monitoring-specific field key naming, and verification support structures.

### [Chapter 11: Advanced Schema Techniques](chapter-11/)

**Focus**: API schema management, standardized properties, Required field types, and UUID management.

**What You'll Learn**: Schema management with API operations, the four Required field types (None/Hidden/Required/Auto Calculate), standardized property definitions from GBBC specifications, and UUID management for efficient development.

**Practical Skills**: API schema updates, Auto Calculate field implementation, standardized property usage, and UUID-based schema version management.

### [Chapter 12: Schema Testing and Validation Checklist](chapter-12/)

**Focus**: Practical validation steps using Guardian's testing features before schema deployment.

**What You'll Learn**: Systematic testing approach using Default Values, Suggested Values, and Test Values. Covers schema preview testing, UUID integration into policy workflows, and user experience validation.

**Practical Skills**: Guardian schema testing tools usage, validation rule configuration, logical field organization, and pre-deployment checklist completion.

## Building on Part II Foundation

Part III directly implements the analysis work from Part II. Your methodology decomposition, parameter identification, and test artifacts become the inputs for schema development.

**Implementation Translation**: The parameter lists, dependency trees, and calculation frameworks from Part II translate directly into Guardian schema configurations through the techniques taught in Part III.

**Test Integration**: Test artifacts from Chapter 7 integrate with schema testing in Chapter 12, ensuring implementations maintain accuracy while providing good user experience.

## Part III Completion

Completing Part III provides you with:

* Production-ready PDD and monitoring schemas for your methodology
* Guardian schema development skills transferable to other methodologies
* Understanding of schema testing and validation best practices
* Schema management techniques for efficient development and maintenance

**Preparation for Part IV**: The schemas created in Part III integrate directly with Guardian policy workflow blocks. Your data structures and validation rules become the foundation for complete methodology automation.

## Time Investment

Each chapter requires approximately 15-25 minutes reading plus 30-60 minutes hands-on practice:

* **Chapter 8**: 20 min reading + 30 min practice (architectural understanding)
* **Chapter 9**: 25 min reading + 60 min practice (comprehensive PDD schema development)
* **Chapter 10**: 20 min reading + 45 min practice (monitoring schema development)
* **Chapter 11**: 25 min reading + 45 min practice (advanced techniques)
* **Chapter 12**: 15 min reading + 30 min practice (testing checklist)

**Total Investment**: \~3-4 hours for complete schema development capabilities

***

## Chapter Navigation

| Chapter               | Title                                   | Focus                                       | Reading Time | Practice Time |
| --------------------- | --------------------------------------- | ------------------------------------------- | ------------ | ------------- |
| [**8**](chapter-8/)   | **Schema Architecture and Foundations** | Guardian schema basics and field mapping    | \~20 min     | \~30 min      |
| [**9**](chapter-9/)   | **PDD Schema Development**              | PDD schema step-by-step                     | \~25 min     | \~60 min      |
| [**10**](chapter-10/) | **Monitoring Schema Development**       | Time-series monitoring and field management | \~20 min     | \~45 min      |
| [**11**](chapter-11/) | **Advanced Schema Techniques**          | API management, Required types, UUIDs       | \~25 min     | \~45 min      |
| [**12**](chapter-12/) | **Schema Testing Checklist**            | Practical validation and testing steps      | \~15 min     | \~30 min      |

{% hint style="success" %}
**Ready to Begin**: With Part II analysis complete, you're prepared for hands-on schema development. Start with Chapter 8 for Guardian schema system foundations.
{% endhint %}
