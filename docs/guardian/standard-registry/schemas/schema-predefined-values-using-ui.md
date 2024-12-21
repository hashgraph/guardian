---
icon: sidebar-flip
---

# Schema Predefined Values using UI

1. [Step By Step Process](schema-predefined-values-using-ui.md#id-1.-step-by-step-process)
2. [Demo Video](schema-predefined-values-using-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## 1. Schema Predefined Values

Predefined schema values allow users to set up values for each field in schema (number, string, GeoJSON, or other nested schema) and use them in policy while displaying request blocks. There are 3 types of predefined values:

* **Default Value** - This value will be used in the document in the absence of user input. I.e. Guardian pre-populates the field with the Default Value which, if not changed explicitly by the user, would appear in the resulting document as if it was input by the user.
* **Suggested Value** - This provides an example of the correct value a user could input into the field. Unlike ‘Default Value’ it is not inserted automatically into the document, it just serves as a visual aid for users filling out the form.
* **Test Value** - This will be used for quick filling out the form for testing in Dry-Run mode. When the ‘Test’ button is clicked all fields in the form which have associated ‘Test Value’ will be auto-populated with these values correspondingly, so the user can quickly proceed to the next step in the policy flow with valid test data in the resulting document.

### 1.1 Setting Predefined Values:

Predefined values can be found in the schema configuration dialog.&#x20;

There is “Selected values” block and “Show More”/”Show Less” button there.

![](<../../../.gitbook/assets/0 (21).png>)

![](<../../../.gitbook/assets/1 (23).png>)

### 1.1.1 Default value

The default value is the initial field value, which will be marked with gold color until it won’t be changed

![](<../../../.gitbook/assets/2 (25).png>)

### 1.1.2 Suggest value

The suggest value is the value, which will be suggested when field value is empty

![](<../../../.gitbook/assets/3 (21).png>)

### 1.1.3 Test Value

The test value is the value, which will be inserted after clicking on the “Test” button. **It is only available in Dry-Run mode.**

![](<../../../.gitbook/assets/4 (19).png>)

### 2. Complex cases

Predefined values can also be used in more complex cases such as multiple fields, nested schemas, geoJSON.

![](<../../../.gitbook/assets/5 (22).png>)

![](<../../../.gitbook/assets/6 (21).png>)

![](<../../../.gitbook/assets/7 (21).png>)

## 2. Demo Video

[Youtube](https://youtu.be/wFRk9uHRXss?si=2Gx2FNq6Tk9PnkIR\&t=104)
