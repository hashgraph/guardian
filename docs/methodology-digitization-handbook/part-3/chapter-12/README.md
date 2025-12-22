# Chapter 12: Schema Testing and Validation Checklist

After defining schemas, you need to test and validate them before deployment. This chapter provides a practical checklist to ensure your schemas work correctly and provide good user experience.

## Schema Validation Checklist

### 1. Set Default, Suggested, and Test Values

Add values to help users and enable testing. These are helpful but not mandatory.

**In Guardian Schema Editor**:

* **Default Value**: Pre-filled value that appears when users first see the field
* **Suggested Value**: Recommended value shown to guide users
* **Test Value**: Value used for testing schema functionality

![Schema edit interface showing test, suggested and default values](<../../../.gitbook/assets/image (37).png>)

**Example Values Setup**:

```excel
Field: "Project Area (hectares)"
Default Value: 100
Suggested Value: 500
Test Value: 250
```

**Benefits**:

* Users see helpful starting values
* Testing becomes easier with pre-filled data
* New users understand expected input formats

### 2. Preview and Test Schema Functionality

Use Guardian's preview feature to test your schema before deployment.

**Preview Testing Process**:

1. Click "Preview" in Guardian schema interface
2. Fill out form fields using test values
3. Test conditional logic by changing enum selections
4. Verify required field validation works
5. Test sub-schema loading and visibility
6. Check file upload fields accept appropriate formats

![alt text](<../../../.gitbook/assets/image-1 (1).png>)

**Test These Elements**:

* [ ] All enum selections show/hide correct fields
* [ ] Required fields prevent form submission when empty
* [ ] Field types validate input correctly (numbers, dates, emails)
* [ ] Help text displays properly
* [ ] Sub-schemas load and display correctly

### 3. Update Schema UUIDs in Policy Workflows

Insert your new schema UUIDs where documents are requested or listed in policy workflow blocks.

**UUID Replacement Process**:

1. Copy new schema UUID from JSON schema (click hamburger menu next to schema row, click on "Schema")
2. Open policy workflow configuration
3. Find blocks that use old schema references:
   * `requestVcDocumentBlock`
   * `documentsSourceAddon`
4. Replace old UUID with new schema UUID
5. Save policy configuration

![JSON edit mode for a block](<../../../.gitbook/assets/image-2 (2).png>)

### 4. Verify Test Artifact Completeness

Ensure no fields are missing compared to your test artifact design from Part II.

**Completeness Check**:

1. Open your test artifact spreadsheet from Part II analysis
2. List all required parameters from methodology
3. Check each parameter has corresponding schema field
4. Verify calculation fields capture all intermediate results
5. Confirm evidence fields cover all required documentation

**Missing Field Checklist**:

* [ ] All methodology parameters have schema fields
* [ ] Calculation intermediate results are captured
* [ ] Evidence requirements have file upload fields
* [ ] Conditional parameters appear based on method selection
* [ ] Time-series fields exist for monitoring schemas

### 5. Optimize Logical Flow and User Experience

Organize fields and sections for intuitive user experience.

**UX Organization Principles**:

* **Logical Grouping**: Group related fields together
* **Progressive Disclosure**: Basic information first, complex details later
* **Clear Labels**: Use terminology familiar to domain experts
* **Helpful Ordering**: Required fields before optional ones
* **Conditional Logic**: Show relevant fields based on previous selections

**Field Organization Checklist**:

* [ ] Project information appears first
* [ ] Method selection drives appropriate conditional fields
* [ ] Calculation parameters grouped by methodology section
* [ ] Evidence fields grouped near related data fields
* [ ] Optional fields appear after required ones
* [ ] Help text explains complex or technical fields

**Example Logical Flow**:

```
1. Basic Project Info (title, developer, dates)
2. Certification Path Selection (VCS/CCB)
3. Methodology Selection (calculation methods)
4. Method-Specific Parameters (conditional)
5. Evidence Documentation
6. Validation and Review
```

Once schemas pass this validation checklist, they're ready for integration into Guardian policy workflows. Well-tested schemas provide:

* Smooth user experience for data entry
* Accurate data types for calculations
* Proper validation to prevent errors
* Clear organization for efficient workflows
* Reliable foundation for policy automation

The next part of the handbook covers policy workflow design, where these validated schemas integrate with Guardian's policy engine to create complete methodology automation.
