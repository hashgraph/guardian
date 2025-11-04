# Testing and Validation

Best practices for testing and validation of schemas in Hedera Guardian focus on using Guardian’s built-in testing tools, structured validation rule configuration, and systematic pre-deployment checks to ensure data integrity and a smooth user experience.

### Key Best Practices for Testing and Validation

* **Use a Layered Testing Approach**\
  Test schemas with multiple types of data inputs including:
  * Default Values: Prepopulated values to verify logic and defaults
  * Suggested Values: Sample inputs for user guidance
  * Test Values: Edge cases and real-world scenarios to stress-test validation rules.
* **Validation Rule Configuration**\
  Define explicit validation rules for each field, including:
  * Required field enforcement
  * Value ranges for numeric fields (e.g., latitude must fall between -90 and 90)
  * Enum value restrictions for controlled vocabularies
  * Patterns or formats for strings (e.g., URLs, date formatting)
  * Conditional validation depending on other field values, ensuring context-appropriate data capture.
* **Preview and Simulation**\
  Utilize Guardian’s schema preview mode to simulate user input and workflow transitions before publishing. Confirm that conditional visibility, sub-schema activation, and validation messages behave as expected.
* **Test UUID Integration and Policy Workflow Compatibility**\
  Confirm that UUID field keys are correctly managed and that schema data cleanly integrates with policy workflows and credential issuance processes.
* **Logical Field Organization**\
  Group related fields logically to simplify validation and to facilitate formula application for calculated fields. This organization supports comprehensive, maintainable schema validation.
* **Document Test Cases and Results**\
  Maintain records of validation test cases, pass/fail outcomes, and corrective actions. This documentation supports audit readiness and ongoing maintenance.
* **User Experience (UX) Focus**\
  Confirm validation error messages are clear, actionable, and guide users efficiently to resolve issues during data submission.
* **Iterative Refinement**\
  Use feedback from testing and real-world use to iteratively improve schema validation rules and data capture quality.
