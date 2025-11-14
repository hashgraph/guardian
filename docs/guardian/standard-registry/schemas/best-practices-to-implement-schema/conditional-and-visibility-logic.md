# Conditional and Visibility Logic

Best practices for implementing conditional and visibility logic in Hedera Guardian schemas focus on maintaining clarity, avoiding conflicts, and ensuring logical coherence across user input flows. Effective use of these practices ensures schemas adapt dynamically to user interactions while remaining maintainable and robust.

### Key Best Practices

* **Visualize User Workflow First**\
  Map out scenarios and user journeys before defining conditional logic. This helps identify where fields should appear, be hidden, required, or read-only depending on prior inputs, ensuring an intuitive form flow.

<figure><img src="../../../../.gitbook/assets/image (6) (1).png" alt=""><figcaption></figcaption></figure>

* **Use Clear and Distinct Conditions**\
  Define precise conditional statements that combine multiple criteria sensibly. For example, use AND/OR logic to activate visibility rules rather than relying on overlapping or ambiguous conditions, preventing conflicts when multiple rules could apply.
* **Avoid Overly Complex Nesting**\
  Instead of stacking multiple nested if-then-else statements, leverage `oneOf` or `anyOf` constructs where possible, which simplifies schema readability and validation performance. This approach is especially useful for multiple mutually exclusive states.
* **Combine Conditions When Necessary**\
  For complex workflows, combine multiple conditions into a single rule rather than having separate rules that could override each other. For example, structure combined conditions as:\
  IF (Q1 = "Yes" AND Q2 >= 3) THEN show Q3 else hide Q3.\
  This prevents conflicts where last-interaction rules could unintentionally override previous ones.

<figure><img src="../../../../.gitbook/assets/image (7) (1) (4).png" alt=""><figcaption></figcaption></figure>

* **Test Conditional Logic Extensively**\
  Rigorous testing is essential. Use Guardian’s dry run mode or real data simulations to verify that fields behave as expected across all relevant input combinations. Confirm that visibility and requirement rules are mutually consistent.

<figure><img src="../../../../.gitbook/assets/image (9) (1).png" alt=""><figcaption></figcaption></figure>

* **Explicitly Label Rules and Conditions**\
  Clearly describe each conditional rule’s purpose with labels and comments. This documentation helps team members understand reasoning, especially when rules grow complex.

<figure><img src="../../../../.gitbook/assets/image (10) (1).png" alt=""><figcaption></figcaption></figure>

* **Handle Overwrites Carefully**\
  Be mindful that rules can override each other. Explicitly document and test cases where multiple conditions influence the same field to ensure consistent behavior. When conflicts arise, merge conditions into a single, comprehensive rule.
* **Use Standardized Syntax and Functions**\
  If the schema platform supports it, employ functions and operators like `allOf`, `anyOf`, `not`, and `if-then-else` for clarity and efficiency.

### Example Approach

Instead of overlapping rules:

* Rule 1: IF Q1 = "Yes" THEN Q2 visible
* Rule 2: IF Q3 < 5 THEN Q2 not visible

Use:

* IF (Q1 = "Yes" AND Q3 >= 5) THEN Q2 visible, ELSE hidden.

This way, a single, comprehensive rule governs the visibility, avoiding conflicts.
