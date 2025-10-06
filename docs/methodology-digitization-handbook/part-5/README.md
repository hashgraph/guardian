# ✅ Part V: Calculation Logic Implementation

> **Status**: ✅ Complete and Available  
> **Implementation Focus**: VM0033 emission reduction calculations, Guardian Tools architecture, and comprehensive testing frameworks

This part covers the implementation of calculation logic in Guardian environmental methodologies, with VM0033 as the primary example and AR Tool 14 demonstrating Guardian's Tools architecture.

## Part Overview

Part V provides comprehensive guidance on implementing and testing calculation logic for environmental methodologies in Guardian:

### [Chapter 18: Custom Logic Block Development](chapter-18/README.md)
Complete implementation of VM0033 emission reduction calculations using Guardian's customLogicBlock, including baseline emissions, project emissions, leakage calculations, and final net emission reductions with real JavaScript production code.

### [Chapter 19: Formula Linked Definitions (FLDs)](chapter-19/README.md)  
Foundation concepts and architectural framework for parameter relationships and dependencies in environmental methodologies, establishing patterns for future FLD implementation.

### [Chapter 20: Guardian Tools Architecture and Implementation](chapter-20/README.md)
Complete guide to building Guardian Tools using AR Tool 14 as practical example, covering the extractDataBlock → customLogicBlock → extractDataBlock mini-policy pattern for standardized calculation tools.

### [Chapter 21: Calculation Testing and Validation](chapter-21/README.md)
Comprehensive testing framework using Guardian's dry-run mode and customLogicBlock testing interface, with validation against VM0033 test artifacts at every calculation stage.

## Key Artifacts and Resources

- **[VM0033 Test Spreadsheet](../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx)** - Official Allcot test case
- **[Final PDD VC](../_shared/artifacts/final-PDD-vc.json)** - Complete Guardian VC with net ERR data  
- **[ER Calculations](../_shared/artifacts/er-calculations.js)** - Production JavaScript implementation
- **[AR Tool 14 Implementation](../_shared/artifacts/AR-Tool-14.json)** - Complete Guardian Tool configuration

## Prerequisites for Part V

- Completed Parts I-IV: Foundation through Policy Workflow Implementation  
- Understanding of Guardian's Policy Workflow Engine (PWE)
- Basic JavaScript programming knowledge
- Familiarity with environmental methodology calculations

## Learning Outcomes

After completing Part V, you will be able to:

✅ **Implement calculation logic** using Guardian's customLogicBlock with real production examples  
✅ **Build Guardian Tools** using the extractDataBlock and customLogicBlock pattern  
✅ **Test and validate calculations** using Guardian's dry-run mode and testing interfaces  
✅ **Debug calculation issues** using Guardian's built-in debugging tools  
✅ **Create production-ready** environmental methodology implementations  

## Next Steps

Part V completes the core implementation knowledge needed for Guardian methodology digitization. Future parts will cover:

- **Part VI**: Integration and Testing - End-to-end policy testing and API automation
- **Part VII**: Deployment and Maintenance - Production deployment and user management  
- **Part VIII**: Advanced Topics - External system integration and troubleshooting

---

{% hint style="success" %}
**Part V Complete**: You now have comprehensive knowledge of calculation logic implementation in Guardian, from individual customLogicBlocks to complete testing frameworks. These skills enable building production-ready environmental methodologies with confidence in calculation accuracy.
{% endhint %}