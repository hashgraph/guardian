# Chapter 19: Formula Linked Definitions (FLDs)

> Understanding Guardian's parameter relationship framework for environmental methodologies

This chapter details the use of Formula Linked Definitions (FLDs) and how it enables users to view/cross-check human readable mathematical representations of the customLogicBlock calculations whenever they look at relevant schemas, policies or documents with data. It will also describe how to create Formula Linked Definitions by linking the relevant fields in schemas with the parameters in the mathematical equations of Methodology.

Once the FLDs are created, when the particular Verifiable Credentials (VCs)/Schemas are viewed in the published policy. The formulas will be displayed alongside the relevant fields enabling users such as VVBs and auditors to verify that the formulas are in sync with the methodology and the calculations are accurate.


## Learning Objectives

After completing this chapter, you will be able to:

- Understand the concept and architecture of Formula Linked Definitions in Guardian
- Identify parameter relationships suitable for FLD implementation and its mapping with the fields in policy schemas
- Implement FLDs to enable users to view formulas in customLogicBlock calculations
- Design parameter validation workflows using FLD patterns
- Recognize opportunities for FLD optimization in VM0033 calculations

## Prerequisites

- Completed Chapter 18: Custom Logic Block Development
- Understanding of parameter dependencies from Part II: Analysis and Planning
- Familiarity with VM0033 calculation structure from [er-calculations.js](../../_shared/artifacts/er-calculations.js)

## Building Formula Linked Definitions

When navigating to the "Manage Formulas" from the sidebar in Guardian, you can choose to create a new formula or import the formula using the .formula file. For this documentation we will look at creating a new formula (FLD) from scratch. 

Once you click on create a new formula, you will see three tabs:

### Overview Tab

In this tab, you would put in basic details about your formula such as name, description and the policy it belongs to.

### Edit Formula

There are 4 types of items available in order to compose a formula:

- **Constants** are the fixed values that can be used in a formula. This item contains three fields where you can fill constant's: 
    - `Name`
    - `Description`
    - `Value`
- **Variables** are going to be the data coming in from the documents. This can be linked to a particular field in the schemas of the policy or a component of another FLD formula. Along with the name and description, this item also has a 
    - `Link (Input)` field where the particular field from the schemas/component from other forumlas (FLDs) can be added. 
- **Formulas** item can be used to input the Mathematical Formula. Along with name and description fields, formula item also has 
    - `Formula` field where the Mathematical formula can be added with the built in Math keyboard or LaTex form. 
    - `Link (Output)` field which indicates the field in the document schema where the result of the calculation defined in CustomLogicBlock is located 
    - `Relationships` field where you can add all the variables and constants that are related/used in the formula. This enables navigation in a Formula using its variables when the user is looking at the published formulas in the schemas/VC documents.
- **Text** a component which allows the description of the calculation algorithm without using mathematical notation. This component does not require any specific syntax. Text item contains the following fields:
    - `Name` of the text 
    - `Description` of the text
    - `Text` that needs to be added
    - `Link (Output)` which indicates the field in the document schema where the text should be shown.
    - `Relationships` field where you can select all the variables, constants and formulas that are related.

Using the combination of the above 4 items, a Formula Linked Definitions can be generated which will explain the code/calculations that happen in the CustomLogicBlock. The best approach is to go from bottom to top i.e. create all the small formulas and variables/constants it is related to and then work you way up to create the final formula that represents the Main Formula of the methodology. A formula item can be used inside another formula which will create a heirarchy for the end users to track how each component is being calculated. 

In order to have better readability, it is recommended to add relevant name and descriptions for the above items. 

### Attach Files

Here you can attach all the relevant documents concerned with the Methodology that can help with the verification of the Formulas. This will help the users (vvb, auditors etc.) to be able to look up the documents in guardian itself instead of finding it on the Internet. The files that are attached will be shown to the users in `Files` tab when the published document is viewed (refer to **Viewing Formula Linked Definitions**)

## Viewing Formula Linked Definitions

Once the policy and the formulas are published, all the relevant document (VC) will have a button besides the linked fields to view the FLD. Once clicked, the Formula display dialogue shows all linked formulas and provides facilities to navigate through the components of these formulas. In the dialog, all the relationships that were added can be seen along with its value that was filled by the user. This makes the verification of the calculations and formulas easier. 

Along with the formulas, there will be a `Files` tab which will show all the files attached by the FLD developer (usually the policy developer)

## Chapter Summary

Formula Linked Definitions provide a structured approach to managing parameter relationships in Guardian methodologies so that the users can cross-verify that the formulas used and the calculations behind the scenes (CustomLogicBlock) is correct.

Key takeaways:

- **FLDs enable users to view human readable mathematical representations** of the calculations taking place in the CustomLogicBlock
- **VM0033 offers clear examples** of parameter relationships suitable for FLD implementation
- FLDs allows to browse associations between fields in schemas/documents and the corresponding variables in the displayed math formulas.
- Guardian platform allows users to navigate the hierarchy of formulas and the data they represent, and view mapping variables in the formula to fields in schemas.

### Next Steps

Chapter 20 will demonstrate implementing specific AR Tool calculation patterns, showing how the parameter relationships we've identified in FLDs translate into working calculation code for biomass and soil carbon assessments.

## References and Further Reading

- [Guardian customLogicBlock Documentation](../../../available-policy-workflow-blocks/customlogicblock.md)
- [VM0033 Calculation Implementation](../../_shared/artifacts/er-calculations.js)
- [VM0033 Test Case Artifacts](../../_shared/artifacts/VM0033_Allcot_Test_Case_Artifact.xlsx)

---