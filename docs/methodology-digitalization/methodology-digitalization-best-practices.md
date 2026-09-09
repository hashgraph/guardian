---
icon: book-open-lines
tags:
  - tag: new
    primary: true
---

# Methodology Digitalization Best Practices

Digitalizing a methodology is about more than just moving a paper form into a digital tool. It's an opportunity to embed the standard's rules directly into the reporting experience, so proponents, VVBs, and reviewers are all working from the same consistent, well-structured data. The insights below reflect the latest thinking on how to do this well in Guardian.

It starts with a problem: every standard publishes generic templates for project proponents and VVBs to complete when documenting project descriptions, monitoring reports, validation reports, and verification reports. Because these templates are generic by design, users are left to interpret and apply methodology-specific applicability rules, data and parameter requirements, and quantification approach selections on their own. That's where inconsistency creeps in, and where reviewers lose time hunting for the information they need.

Guardian's best practice is to solve this at the source: build methodological rules directly into the templates before they ever reach the end user. Rather than asking proponents to figure out what applies to them, the template itself guides them to respond to the exact questions and requirements the methodology demands. The result is standardized reporting data across projects, and a much easier job for reviewers trying to locate and interpret that data.

### Schema Templates

To make this consistent at scale, especially across the many methodologies built on a single standard, Guardian introduced Schema Templates. This feature lets a policy author define a generic template's data structure once and lock the fields that must remain uniform across every methodology under a standard (e.g., VCS), while leaving the sections that need methodology-specific customization open for collaborating policy authors to edit. Once those rules, covering data structure and allowable customizations, are established, the template can be shared with collaborators to build from.

Learn more [schema-templates](../guardian/workspace/schema-templates/ "mention")

### Cross-Schema Conditions

Once the template structure is set, the next challenge is making sure users are only ever asked for what actually applies to their project. Guardian addresses this during schema authoring with cross-schema conditions, which allow fields and sections to be shown or hidden based on the user's previous responses, whether nested within the same schema or dependent on a response in another schema entirely. This keeps the form relevant to the specific project rather than presenting every possible field regardless of applicability.

Learn more [cross-schema-conditions](../guardian/workspace/schemas/cross-schema-conditions/ "mention")

### Repeatable Field Links

A related challenge arises with grouped or multi-instance projects. If a project proponent indicates they have a grouped project with two project locations, they need to name each instance (e.g., instance1, instance2), and every subsequent field requiring an instance name should reflect those same instances automatically. Guardian handles this with repeatable field links, which define dependencies between fields so that once instances are established, users respond to every relevant requirement for each instance consistently, rather than re-entering or mismatching instance names across the report.

Learn more: [repeatable-field-links](../guardian/workspace/schemas/repeatable-field-links/ "mention")

### Geo Field Types

Location data introduces its own risk of inconsistency, since a continent, country, and state or province can easily be entered in ways that don't logically align. To prevent this, Guardian's geo field types validate that these selections match one another correctly.

Learn more: [geo-fields](../guardian/workspace/schemas/geo-fields/ "mention")&#x20;

### Calculations and the Math Block

With the reporting structure in place, the next piece is calculation. Schemas should also be created for calculation inputs and outputs, though these are read-only and appear only after calculations have executed. All calculations themselves should be incorporated into policies using the Math Block, with every calculation input sourced from the schemas representing the project description and monitoring reports. This closes the loop for the user: each data point is entered only once, in the project boundary, quantification, and monitoring sections, rather than duplicated across the workflow.

Learn more: [mathblock.md](../guardian/workspace/policies/policy-creation/introduction/mathblock.md "mention")

### Document Validator Blocks

The last layer of consistency happens beyond the schema itself, in the policy configurator, using document validator blocks. These allow policy authors to validate data across multiple reports for the same project, for example, confirming that the project start date is consistent between the project description and later monitoring reports. This is just one example; production-level policies typically include many such validations.

Learn more: [documentvalidatorblock](../guardian/workspace/policies/policy-creation/introduction/documentvalidatorblock/ "mention")

### Designing for UX and API

Tying it all together, every schema should be designed with both the human user and the API consumer in mind. That means proper nesting of main sections and sub-sections, and descriptive keys that make sense whether a person is reading the form or a developer is querying it programmatically.

## Ready to go further?

[Review the handbook for in depth topics and details. ](https://app.gitbook.com/s/bKnJV8vV7zUxRwKIsJKg/methodology-digitalization)
