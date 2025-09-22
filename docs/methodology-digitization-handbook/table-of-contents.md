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

### [Chapter 8: Schema Architecture and Foundations](part-3/chapter-8/README.md)

Guardian schema system fundamentals, JSON Schema integration, and two-part architecture patterns. Establishes field mapping principles and architectural understanding for methodology schema development.

### [Chapter 9: Project Design Document (PDD) Schema Development](part-3/chapter-9/README.md)

Step-by-step Excel-first approach to building comprehensive PDD schemas. Covers Guardian template usage, conditional logic implementation, sub-schema creation, and essential field key management for calculation code readability.

### [Chapter 10: Monitoring Report Schema Development](part-3/chapter-10/README.md)

Time-series monitoring schema development with temporal data structures, annual parameter tracking, and field key management for time-series calculations. Includes VVB verification workflow support.

### [Chapter 11: Advanced Schema Techniques](part-3/chapter-11/README.md)

API schema management, standardized property definitions, Required field types (None/Hidden/Required/Auto Calculate), and UUID management for efficient schema development and maintenance.

### [Chapter 12: Schema Testing and Validation Checklist](part-3/chapter-12/README.md)

Practical schema validation using Guardian's testing features including Default/Suggested/Test values, preview testing, UUID integration, and pre-deployment checklist for production readiness.

## Part IV: Policy Workflow Design and Implementation

### [Chapter 13: Policy Workflow Architecture and Design Principles](part-4/chapter-13/README.md)

Guardian policy architecture fundamentals, workflow block system, event-driven communication, and design patterns. Establishes core concepts for building production-ready environmental policies using VM0033 as the implementation reference.

### [Chapter 14: Guardian Workflow Blocks and Configuration](part-4/chapter-14/README.md)

Complete guide to Guardian's workflow blocks including interfaceDocumentsSourceBlock, buttonBlock, requestVcDocumentBlock, and role management. Covers block configuration, permissions, event routing, and UI integration with practical VM0033 examples.

### [Chapter 15: VM0033 Implementation Deep Dive](part-4/chapter-15/README.md)

Deep technical analysis of VM0033 policy implementation using actual JSON configurations. Covers VVB approval workflows, project submission processes, and role-based access patterns with real Guardian block configurations extracted from production policy.

### [Chapter 16: Advanced Policy Patterns](part-4/chapter-16/README.md)

Advanced policy implementation patterns including transformation blocks for Verra API integration, document validation blocks, external data integration, policy testing frameworks, and demo mode configuration using VM0033 production examples.

## ✅ Part V: Calculation Logic Implementation

### [Chapter 18: Custom Logic Block Development](part-5/chapter-18/README.md)

Comprehensive guide to implementing VM0033 emission reduction calculations using Guardian's customLogicBlock. Covers baseline emissions, project emissions, leakage calculations, and final net emission reductions using real JavaScript implementation with VM0033 test artifacts validation.

### [Chapter 19: Formula Linked Definitions (FLDs)](part-5/chapter-19/README.md)

Brief foundation chapter establishing FLD concepts for parameter relationship management in Guardian methodologies. Covers parameter reuse patterns and integration with customLogicBlock calculations using VM0033 examples.

### [Chapter 20: Guardian Tools Architecture and Implementation](part-5/chapter-20/README.md)

Complete guide to building Guardian Tools using AR Tool 14 as practical example. Covers Tools as mini-policies, extractDataBlock workflows, customLogicBlock integration, and production implementation patterns for standardized calculation tools that integrate with multiple methodologies.

### [Chapter 21: Calculation Testing and Validation](part-5/chapter-21/README.md)

Comprehensive testing using Guardian's built-in testing capabilities including dry-run mode and customLogicBlock testing interface. Covers interactive testing with three input methods, validation against VM0033 test artifacts, testing at every calculation stage, and API-based automated testing using Guardian's REST APIs.

## Part VI: Integration and Testing

### [Chapter 22: End-to-End Policy Testing](part-6/chapter-22/README.md)

Testing complete methodology workflows across all stakeholder roles using Guardian's dry-run capabilities and VM0033 production patterns. Covers multi-role testing frameworks, virtual user management, production-scale data validation, and cross-component integration testing.

### [Chapter 23: API Integration and Automation](part-6/chapter-23/README.md)

Automating methodology operations using Guardian's REST API framework. Covers authentication patterns, VM0033 policy block API structure, dry-run operations with virtual users, automated workflow execution, and Cypress testing integration for production deployment.

### [Chapter 24: Guardian Indexer for Methodology Analytics](part-6/chapter-24/README.md)

✅ **Available** - Comprehensive data analytics, search, and monitoring for deployed methodologies using Guardian's global indexing system. Covers global search, project tracking, compliance reporting, and operational insights.

## Part VII: Advanced Topics and Best Practices

### [Chapter 25: Integration with External Systems](part-7/chapter-25/README.md)

✅ **Available** - Bidirectional data exchange between Guardian and external platforms. Covers data transformation using dataTransformationAddon blocks and external data reception using MRV configuration patterns.

### [Chapter 26: Troubleshooting and Common Issues](part-7/chapter-26/README.md)

✅ **Available** - Practical tips and solutions for common problems encountered during methodology digitization. Covers schema development pitfalls, development workflow optimization, custom logic testing, and event troubleshooting.

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
