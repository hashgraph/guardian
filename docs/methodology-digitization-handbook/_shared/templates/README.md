# 📄 Templates

> Standard templates for consistent content structure across all handbook parts

## Overview

These templates ensure consistent structure, formatting, and quality across all chapters in the Methodology Digitization Handbook (Parts I-VIII).

## Available Templates

### [Chapter Section Template](chapter-section-template.md)

Standard structure for individual chapter sections with:

* GitBook formatting (hints, tabs, collapsible sections)
* VM0033 integration points
* User input requirement markers
* Guardian documentation reference patterns
* Testing and validation sections

### [Chapter Summary Template](chapter-summary-template.md)

Standard structure for chapter summaries with:

* Key takeaways organization
* Next chapter preparation

## Template Usage Guidelines

### Available Elements

Templates may or may not include these elements depending on chapter context:

* **Learning Objectives**: Specific, measurable outcomes
* **Prerequisites**: Clear requirements and dependencies
* **VM0033 Context**: Practical methodology examples
* **Guardian Integration**: Links to existing documentation
* **User Input Requirements**: Explicit markers for required input
* **Validation Procedures**: Testing and verification methods

### GitBook Formatting Standards

* **Hint Blocks**: `<div data-gb-custom-block data-tag="hint" data-style='info|success|warning|danger'></div>`
* **Tabs**: `<div data-gb-custom-block data-tag="tabs"></div>` and \`

\`

* **Collapsible Sections**: `<details><summary>Title</summary>Content</details>`
* **Code Blocks**: Proper syntax highlighting
* **Cross-References**: Consistent linking patterns

### Content Quality Requirements

* **Reading Time Constraints**: Specific time limits per template type
* **Dual Audience Focus**: Content serves both Verra maintenance and newcomer learning
* **Practical Focus**: Emphasis on actionable guidance over theory
* **Accuracy Requirements**: All examples must be user-validated

## Template Customization

### Part-Specific Adaptations

Templates can be adapted for specific parts while maintaining core structure:

* Part-specific learning objectives
* Relevant Guardian documentation references
* Appropriate VM0033 examples for the part's focus

### Chapter-Specific Modifications

Individual chapters may modify templates for specific needs:

* Additional sections for complex topics
* Specialized validation procedures
* Extended examples for difficult concepts
* Custom formatting for technical content

## Quality Assurance

### Template Compliance Validation

```markdown
## Template Compliance Checklist

For each chapter section:
- [ ] Follows appropriate template structure
- [ ] Includes all required elements
- [ ] Uses proper GitBook formatting
- [ ] Marks user input requirements
- [ ] Links to Guardian documentation appropriately
- [ ] Meets reading time constraints
- [ ] Serves dual audience effectively
```

***

{% hint style="info" %}
**Template Usage**: All handbook content must follow these templates to ensure consistency, quality, and maintainability across all parts.
{% endhint %}
