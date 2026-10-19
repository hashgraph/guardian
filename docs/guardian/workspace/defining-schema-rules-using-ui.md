# Schema Rules

1. [Step By Step Process](defining-schema-rules-using-ui.md#id-1.-step-by-step-process)
2. [Demo Video](defining-schema-rules-using-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## **Schema rules**

Schema rules have been created to enable authorised policy users to offer assistance to other users (and/or themselves) with data input and/or data evaluation. Schema rules define acceptable values and their ranges for schema fields (and correspondingly input fields in Guardian forms). They are activated in the UI whenever the form is viewed by users, and re-evaluated every time any of the values on the form is changed. Rules can contain mathematical formulas and logical if-then-else flow, and source data from any field in the current schema as well as any other schemas/documents that are present in the corresponding policy. When rules are evaluated they produce a binary ‘pass/fail’ output, which is displayed in the UI as green and amber field highlights correspondingly.

### **1. Creation**

#### **1.1 List of schema rules**

Each Policy can have associated by Schema rules. The list of schema rules is displayed in the corresponding section of the UI, which provides the facility to enable/disable each of them individually.

#### **1.2 Creation**

To initiate the creation of a new schema rules users need to click on the ‘Create New’ button in the corresponding UI section.

#### **1.3 Configuration**

After a rule has been created it should be configured to be meaningful, the process can be started by clicking the edit icon in the rules grid.

**1.3.1 General configuration**

Specifying the rules name and its ‘target’ policy is mandatory. These details are in the **Rule details** popover, which opens when the rule title in the top bar is clicked. They are saved with the **Save** button.

The top bar also shows the rule status (Draft or Active). Clicking the status badge allows to **Activate** or **Deactivate** the rule, and the **Unsaved changes** marker appears after any edit. The page has two views, switched with the **Schemas | Rules** control: the schema tree, and the table of the selected input fields with the number of fields.

**1.3.2 Configuring fields and schema**

To source data from documents rule creators need to specify which fields from which schemas should be retrieved. Schema tree view shows policy schemas in a hierarchical structure, and allows to select the target fields.

**1.3.2.1 Search**

In complex policies the complexity of schema structures can be difficult to navigate, rules creators could use search tool to optimize their work.

**1.3.2.2 Selection**

Clicking on a schema box opens the side menu which lists all the fields available in the selected schema.

_Note: sub-schemas do not produce corresponding document, when such sub-schema is selected in the schema view the right hand panel shows the fields from the parent schema of which this sub-schema is a part._

**1.3.2.3 Properties**

By default searching for fields is performed on the basis of the values in their description field, however it is possible to search for matches in their ‘property’ values by navigating into the corresponding tab.

_Note: some schema fields might not have or have empty property fields, such cases are displayed as greyed-out items in the list and their ‘description’ field is shown instead_

**1.3.3 Configuring formulas**

The selected schemas and their fields constitute ‘input’ data for the rules. The second stage of rule configuration is specifying the rules themselves and their formulas.

The system automatically creates short variable names for the target fields, each of which then can be used as a rule target (for which to specify the acceptable values/ranged) or used in a formula to specify those for another field variable.

**1.3.3.1 Editing rules**

There are a number of templates that can be used when configuring or editing rules. When a template is not selected for an existing rule it indicates that the rule is effectively non-existent for this field.

**1.3.3.2 Templates**

* **Formula**

Formula is the most flexible and most powerful rule template.

Formulas must be configured such that their evaluation results in a true or false values (or numerical 0/1). Formulas support mathematical operations from [https://mathjs.org/](https://mathjs.org/) and Microsoft Excel function as supported by [https://formulajs.info/functions/](https://formulajs.info/functions/). Formulas can feature any or all fields which have been selected in the previous steps.

* **Range**

Ranges are simplified rules which verify that the value of the target field falls between the two borderline values specified.

* **Condition**

This template allows for configuration of logical flows which can evaluate conditions and employ different formulas depending on the results of those evaluations.

**IF** – a condition to evaluate, must evaluate to ‘true’ or ‘false’\
**THEN** – the rule if the condition is ‘true’\
**ELSE** – the rule which would be employed if none of the ‘if’ conditions above resolved to ‘true’

_Note: in cases where more than one ‘if’ condition would resolve to true only the first ‘then’ gets applied_

The conditions are specified as formulas, which are subject for the principles and conventions specified above.

Formulas support notations for the following typical operations:

* **Text –** compare the values of a textual field to a text
* **Range –** simplified notation to check if the value is in the specified range
* **Enum –** if the field of a type ‘enum’ this option allows the selection of a single or multiple values from the enum for matching. If any of these values match the formula is considered to have been resolved to ‘true’.

**1.3.3.3 Test rules**

The **Test** button in the top bar opens the **Test rules** panel next to the table of the Rules view. It helps users to test the behaviour of the formulas during their configuration. The panel can be used in the read-only mode (active rules) as well.

Users populate the values for the ‘input’ fields (fields with enum values offer a drop-down list). The results are updated as the values are typed and after every rule edit, and the values are kept until the user leaves the page. They are never saved. **Clear values** resets the panel. Hovering a row of the panel highlights the corresponding row of the table.

If the formula contains an error, or the system is unable to calculate the resulting value the field would be marked **Can't evaluate** and highlighted in red.

If the evaluation was successful the field would be marked **Fails** and highlighted in amber (if the value ‘failed’ the evaluation) or **Passes** and highlighted in green (if it was a ‘success’). Fields without a rule are marked **No rule**.

Once all editing is done the rule must be saved.

### **2. Publishing**

Rules can not be published externally. The equivalent action which makes the system to apply rules as describe above is their ‘activation’.

**Note: Rules can be activated/deactivated at any time.**

### **3. Evaluation**

Rules would be downloaded and evaluated every time a document with the associated active rules is being edited via the corresponding Guardian form.

Rules are also valued when such document is being viewed.

New rules would be applied to the documents which have been created before the rules have been specified or activated.

### **4. Access control**

There are specific permissions for working with rules

* **Read**, **Create** – allows to view, create new, and activate existing schema rules
* **Execute** – allows to evaluate the existing rules when editing or viewing their corresponding documents

By default Standard Registries are assigned all 3 permissions. Default role has only Execute permission.

Users without the **Create** permission see the rule configuration page in the read-only mode: fields cannot be selected, IDs and details cannot be edited and the rule status cannot be changed.

### **5. Import/Export**

Schema rules can be exported to and imported from files.

When importing the rules they effectively become the rules of the importing Guardian instance with no dependency or relations to the instances that originally produced and exported the rules.

## 2. Demo Video

[Youtube](https://youtu.be/RQYxEh_cmSU?si=MJUlII3Tl4KTXfd0\&t=91)
