# 🔧 Shared Resources

> Common templates, frameworks, and systems used across all parts of the Methodology Digitization Handbook

## Overview

This directory contains shared infrastructure used across all parts (I-VIII) of the Methodology Digitization Handbook to ensure consistency, quality, and maintainability.

## Shared Components

### [Templates](templates/)

Standard templates for consistent content structure across all chapters and parts

### [VM0033 Integration System](vm0033-integration/)

System for ensuring accurate VM0033 references throughout all handbook content

### [Guardian Integration](guardian-integration/)

System for linking handbook content with existing Guardian documentation

### [Artifacts Collection](artifacts/)

Comprehensive collection of test artifacts, Guardian implementations, calculation tools, and validation materials including:

* **VM0033 Reference Materials**: Complete methodology documentation and Guardian policy implementation
* **Test Data & Validation**: Official test cases, real project data, and Guardian VC documents
* **Guardian Tools & Code**: Production implementations including AR Tool 14 and calculation JavaScript
* **Schema Templates**: Excel-first schema development templates for Guardian integration
* **Development Tools**: Python extractors and validation utilities

## Usage Guidelines

### For Content Developers

1. **Use Standard Templates**: All chapters must follow templates in `templates/`
2. **Follow VM0033 Integration**: Use `vm0033-integration/` system for all methodology references
3. **Link Guardian Docs**: Follow `guardian-integration/` patterns for existing documentation
4. **Leverage Artifacts**: Use `artifacts/` collection for testing, validation, and implementation examples
5. **Test with Real Data**: Validate all examples against official test cases and production implementations

### For Methodology Implementers

1. **Start with Artifacts**: Use test artifacts and reference implementations as foundation
2. **Validate Calculations**: All implementations must match test artifact results exactly
3. **Use Production Code**: Reference `er-calculations.js` and `AR-Tool-14.json` for proven patterns
4. **Test Thoroughly**: Use Guardian's dry-run mode with provided test documents
5. **Follow Patterns**: Use schema templates and policy examples for consistent implementation

### For Part Maintainers

1. **Reference Shared Systems**: Link to shared infrastructure rather than duplicating
2. **Contribute Improvements**: Enhance shared systems for all parts
3. **Validate Compliance**: Ensure part-specific content follows shared standards
4. **Update Artifacts**: Keep artifact collection current with platform changes
5. **Test Integration**: Verify all shared resources work with latest Guardian versions

## Integration with Parts

Each part should reference these shared systems:

```markdown
<!-- In each part's README.md -->
## Content Development Guidelines

This part follows the shared handbook infrastructure:
- **Templates**: [Shared Templates](../_shared/templates/README.md)
- **VM0033 Integration**: [VM0033 System](../_shared/vm0033-integration/README.md)
- **Guardian Integration**: [Guardian System](../_shared/guardian-integration/README.md)
- **Artifacts Collection**: [Test Data & Implementation Examples](../_shared/artifacts/README.md)

## Testing & Validation

All examples and implementations in this part are validated against:
- **Official Test Cases**: VM0033_Allcot_Test_Case_Artifact.xlsx
- **Production Code**: er-calculations.js and AR-Tool-14.json
- **Guardian Integration**: final-PDD-vc.json and vm0033-policy.json
```

## Maintenance

### Shared System Updates

* Updates to shared systems benefit all parts automatically
* Version control ensures consistency across handbook
* Centralized maintenance reduces duplication
* Artifact collection updated with Guardian platform evolution

### Quality Assurance

* **Calculation Accuracy**: All artifacts validated against methodology requirements
* **Guardian Compatibility**: Production code tested in Guardian environment
* **Test Coverage**: Comprehensive test cases covering all calculation scenarios
* **Documentation Quality**: All artifacts include usage instructions and integration examples
* **Version Consistency**: Shared resources maintain compatibility across handbook parts

***

{% hint style="success" %}
**Complete Shared Infrastructure**: This comprehensive shared system provides templates, integration frameworks, and a complete artifact collection including production Guardian implementations, test data, and validation materials. Everything needed for methodology digitization is centralized here for consistency and efficiency.
{% endhint %}

{% hint style="info" %}
**Artifact Collection Highlights**: The artifacts collection includes real production code (`er-calculations.js`), complete Guardian Tools (`AR-Tool-14.json`), official test cases (`VM0033_Allcot_Test_Case_Artifact.xlsx`), and Guardian-ready documents (`final-PDD-vc.json`) for comprehensive testing and validation.
{% endhint %}
