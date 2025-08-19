# 📋 Table of Contents

{% hint style="info" %}
**Navigation Tip**: Use the sidebar navigation or click on any chapter title to jump directly to detailed chapter outlines.
{% endhint %}

## Part I: Foundation and Preparation

### [Chapter 1: Introduction to Methodology Digitization](part-1/chapter-1/README.md)
Understanding the digitization process, Guardian platform capabilities, and the role of VM0033 as our reference methodology. This chapter establishes the context and objectives for methodology digitization.

### [Chapter 2: Understanding VM0033 Methodology](part-1/chapter-2/README.md)
Deep dive into the VM0033 methodology structure, applicability conditions, baseline scenarios, and emission reduction calculations. This chapter provides the domain knowledge foundation needed before digitization begins.

### [Chapter 3: Guardian Platform Overview for Methodology Developers](part-1/chapter-3/README.md)
Comprehensive introduction to Guardian's architecture, Policy Workflow Engine (PWE), schema system, and key concepts specifically relevant to methodology digitization.

## Part II: Analysis and Planning

### [Chapter 4: Methodology Analysis and Decomposition](part-2/chapter-4/README.md)
Systematic approach to reading and analyzing methodology PDFs, identifying key components, stakeholders, and workflow requirements. Includes techniques for extracting calculation logic and parameter dependencies using industry-proven recursive analysis techniques.

### [Chapter 5: Equation Mapping and Parameter Identification](part-2/chapter-5/README.md)
Step-by-step process for identifying all equations used in baseline emissions, project emissions, and leakage calculations. Covers recursive parameter analysis and dependency mapping using VM0033 examples with comprehensive mathematical component extraction.

### [Chapter 6: Tools and Modules Integration](part-2/chapter-6/README.md)
Understanding and incorporating external tools and modules referenced in methodologies. Covers CDM tools, VCS modules, and other standard calculation tools used in VM0033, including unified calculation framework development.

### [Chapter 7: Test Artifact Development](part-2/chapter-7/README.md)
Creating comprehensive test spreadsheets containing all input parameters, output parameters, and final emission reduction calculations. This artifact becomes the validation benchmark for the digitized policy, with real VM0033 test artifact examples.

## Part III: Schema Design and Development

### Chapter 8: Schema Architecture and Design Principles

Fundamental principles of schema design in Guardian, including schema trees, sub-schemas, and the relationship between schemas and policy workflow blocks.

### Chapter 9: Project Design Document (PDD) Schema Development

Detailed walkthrough of creating PDD schemas, including project details, baseline calculations, project emissions, leakage calculations, and final emission reduction estimates using VM0033 structure.

### Chapter 10: Monitoring Report Schema Development

Designing schemas for ongoing monitoring and reporting, including parameter tracking, data validation, and calculation updates based on VM0033 monitoring requirements.

### Chapter 11: Advanced Schema Techniques

Advanced schema features including conditional fields, enum types, auto-calculations, formula linking, and dynamic field visibility. Includes extensive VM0033 examples.

### Chapter 12: Schema Testing and Validation

Methods for testing schema functionality, validating calculations, and ensuring data integrity before integration into policy workflows.

## Part IV: Policy Workflow Design

### Chapter 13: Stakeholder Analysis and Role Definition

Identifying and defining all stakeholders in the methodology workflow (Standard Registry, VVB, Project Developer) and their interactions in the VM0033 context.

### Chapter 14: Carbon Credit Certification Workflow Design

Designing the complete certification workflow from project registration through credit issuance, including validation, verification, and approval processes.

### Chapter 15: Policy Workflow Block Configuration

Detailed guide to configuring each type of policy workflow block, including request blocks, send blocks, interface containers, and role management blocks.

### Chapter 16: Document Flow and State Management

Managing document states, transitions, and approvals throughout the certification process. Includes status tracking and workflow orchestration.

## Part V: Calculation Logic Implementation

### Chapter 17: Custom Logic Block Development

Comprehensive guide to writing JavaScript/Python code for emission reduction(or removal) calculations, including VM0033-specific calculation examples and best practices.

### Chapter 18: Formula Linked Definitions (FLDs)

Understanding and implementing FLDs for complex calculation dependencies and parameter relationships in environmental methodologies.

### Chapter 19: Data Validation and Error Handling

Implementing robust data validation, error handling, and edge case management in calculation logic.

### Chapter 20: Calculation Testing and Verification

Methods for testing calculation logic against test artifacts, debugging calculation errors, and ensuring mathematical accuracy.

## Part VI: Integration and Testing

### Chapter 21: End-to-End Policy Testing

Comprehensive testing strategies including dry runs, role-based testing, and workflow validation using VM0033 scenarios.

### Chapter 22: API Integration and Automation

Using Guardian APIs for automated testing, data submission, and integration with external systems. Includes practical examples for VM0033 data submission.

## Part VII: Deployment and Maintenance

### Chapter 23: User Management and Role Assignment

Setting up user roles, permissions, and access controls for different stakeholders in the methodology workflow.

### Chapter 24: Monitoring and Analytics - Guardian Indexer

Implementing monitoring, logging, and analytics for deployed methodologies to track usage, performance, and issues.

### Chapter 25: Maintenance and Updates

Strategies for maintaining deployed methodologies, handling methodology updates, and managing backward compatibility.

## Part VIII: Advanced Topics and Best Practices

### Chapter 26: Integration with External Systems

Connecting Guardian-based methodologies with external registries, monitoring systems, and third-party tools.

### Chapter 27: Troubleshooting and Common Issues

Common problems encountered during methodology digitization and their solutions, with specific examples from VM0033 implementation.

## Part IX: Appendices and References

### Appendix A: VM0033 Complete Implementation Reference

Complete code examples, schema definitions, and configuration files for the VM0033 implementation.

### Appendix B: Guardian Block Reference Guide

Quick reference guide for all Guardian policy workflow blocks with methodology-specific usage examples.

### Appendix C: Calculation Templates and Examples

Reusable calculation templates and examples for common methodology patterns.

### Appendix D: Testing Checklists and Templates

Comprehensive checklists and templates for testing methodology implementations.

### Appendix E: API Reference for Methodology Developers

Focused API documentation for methodology-specific use cases and automation.

### Appendix F: Glossary and Terminology

Comprehensive glossary of terms used in methodology digitization and Guardian platform.

***

## Chapter Organization

{% hint style="success" %}
**Consistent Structure**: Each chapter follows the same format for easy navigation and learning.
{% endhint %}

<table><thead><tr><th width="200">Section</th><th>Description</th></tr></thead><tbody><tr><td><strong>Learning Objectives</strong></td><td>What you'll accomplish in this chapter</td></tr><tr><td><strong>Prerequisites</strong></td><td>Required knowledge or completed previous chapters</td></tr><tr><td><strong>Conceptual Overview</strong></td><td>Theory and background information</td></tr><tr><td><strong>VM0033 Example</strong></td><td>Practical application using our reference methodology</td></tr><tr><td><strong>Step-by-Step Implementation</strong></td><td>Detailed instructions with code/configuration</td></tr><tr><td><strong>Testing and Validation</strong></td><td>How to verify your implementation</td></tr><tr><td><strong>Common Issues</strong></td><td>Troubleshooting and problem-solving</td></tr><tr><td><strong>Best Practices</strong></td><td>Recommendations and optimization tips</td></tr><tr><td><strong>Chapter Summary</strong></td><td>Key takeaways and next steps</td></tr></tbody></table>

## Estimated Reading Time

{% tabs %}
{% tab title="Complete Handbook" %}
**Total Time**: 20-30 hours

Comprehensive coverage of all aspects of methodology digitization from foundation to advanced topics.
{% endtab %}

{% tab title="Foundation & Schema" %}
**Part I-III**: 12-16 hours

Essential knowledge for understanding Guardian platform and designing data structures.
{% endtab %}

{% tab title="Workflow & Logic" %}
**Part IV-V**: 8-11 hours

Core implementation skills for policy workflows and calculation logic.
{% endtab %}

{% tab title="Integration & Advanced" %}
**Part VI-VIII**: 5-8 hours

Production deployment, maintenance, and advanced techniques.
{% endtab %}
{% endtabs %}

## Prerequisites

{% hint style="warning" %}
**Before You Begin**: Ensure you have the following prerequisites in place.
{% endhint %}

* Basic understanding of environmental methodologies and carbon markets
* Familiarity with JSON and basic programming concepts
* Access to Guardian platform instance for hands-on practice
* VM0033 methodology document for reference

***

{% hint style="info" %}
**Next Steps**: Ready to begin? Start with the [detailed chapter outlines](chapter-outlines.md) or jump directly to Chapter 1.
{% endhint %}
