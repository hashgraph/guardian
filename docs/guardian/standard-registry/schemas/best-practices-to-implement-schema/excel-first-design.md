# Excel-First Design

Detailed best practices for Excel-first design in building Hedera Guardian schemas focus on using structured Excel templates to define all necessary fields, data types, validation rules, and conditional logic clearly before importing into Guardian. This method improves collaboration, clarity, and iterative feedback especially for complex sustainability methodologies.

### Key Best Practices for Excel-First Design

*   **Start with a Standard Header**\
    Use the first rows of the Excel sheet to define the schema identity and type, e.g.,

    * Row 1: Schema Name (e.g., "Project Description (Auto)")
    * Row 2: Schema Description
    * Row 3: Schema Type (e.g., "Verifiable Credentials")
    * Row 4: Column headings for schema field attributes (Required, Field Type, Parameter, Visibility, Question, Multi-Answer, Default).

    <figure><img src="../../../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>
*   **Define Each Field with Clear Attributes**\
    For every schema field, specify:

    * Required (Yes/No)
    * Field Type (String, Number, Date, Enum, Boolean, Image, Auto-Calculate, Help Text, etc.)
    * Parameter or reference to enums/calculations if applicable
    * Visibility setting (TRUE/FALSE/Hidden) to control when fields appear
    * User-facing question (label text)
    * Allow multiple answers? (Yes/No)
    * Default or example value for user guidance.

    <figure><img src="../../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>
* **Use Enums for Controlled Vocabularies**\
  Create separate enum tabs for all enumerated types used in the schema (units of measure, certifications, status types). This standardizes inputs and enables conditional field visibility through enum selections.

<figure><img src="../../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

* **Implement Conditional Logic via Visibility Columns**\
  Use TRUE to keep fields always visible; use FALSE to make fields conditionally visible based on enum selections or workflow stage; use "Hidden" for system-only or metadata fields. This reduces user burden and aligns forms dynamically with project selections.

<figure><img src="../../../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

* **Incorporate Advanced Field Types**\
  Include Auto-Calculate fields for computed values, Image/File Upload fields for supporting documents, and Help Text fields to provide contextual guidance inline.

<figure><img src="../../../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

* **Validation and Data Integrity**\
  Mark critical fields as required to enforce data capture. Choose proper data types for automatic Guardian validation (numbers, dates, boolean, urls). Use patterns or formulas as needed for more complex rules.
* **Field Key Management Post-Import**\
  After importing, rename default field keys in Guardian UI to meaningful, calculation-friendly names. This dramatically improves maintainability of formula/code logic referencing schema fields.
* **Collaborate Closely with Domain Experts**\
  Excel-first enables domain experts (e.g., carbon scientists) to review, comment, and iterate schema designs before committing to implementation.
