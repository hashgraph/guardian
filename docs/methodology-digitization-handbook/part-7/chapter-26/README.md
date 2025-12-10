# 🔧 Chapter 26: Troubleshooting and Common Issues

> Practical tips and solutions for common problems encountered during methodology digitization

This chapter provides informal, practical guidance for resolving common issues during Guardian methodology development. These tips come from real-world experience and can save significant development time.

## Schema Building Best Practices

### Excel-First Schema Development

Building complex schemas via Excel and importing them to Guardian is the fastest way to develop schemas, but there are important pitfalls to avoid:

**⚠️ Guardian Duplicate Schema Issue** Guardian doesn't distinguish between duplicate schemas during import and will create duplicates if the same schema is imported twice. This is especially problematic when teams make small adjustments to Excel schemas and are tempted to re-import the entire file.

**Solution**: Track schema versions carefully and delete duplicates manually when they occur. Consider maintaining a schema change log to avoid confusion.

```bash
# Example: Check for duplicate schemas via API
GET /api/v1/schemas
# Look for schemas with identical names but different UUIDs
```

### Field Key Names from Excel Import

**Issue**: Key names of fields imported via Excel aren't human-readable by default. They appear as generic identifiers that make calculation code difficult to maintain.

**Solution**: Modify field keys manually after import:

1. Go to the schema's **Advanced** tab
2. Edit the Excel cell IDs in the key field
3. Use descriptive names that match your calculation variables

```javascript
// Before: Unreadable keys from Excel import
document.credentialSubject.field_1
document.credentialSubject.field_2

// After: Readable keys after manual editing
document.credentialSubject.projectArea
document.credentialSubject.emissionReductions
```

### Required Fields and Auto-Calculate Pitfalls

Guardian offers three field requirement options:

* **Required**: User must provide value
* **Non-required**: Optional user input
* **Auto-calculate**: Calculated via expressions

**⚠️ Auto-Calculate Limitation** Auto-calculate fields may reference fields from different schemas. If you leave referenced fields empty, the auto-calculate fields won't appear in the indexer.

**Solution**: Use non-required fields and implement calculations in custom logic blocks instead:

```javascript
// In customLogicBlock instead of auto-calculate
const projectArea = document.credentialSubject.projectArea || 0;
const emissionFactor = artifacts[0].emissionFactor || 1;
const totalEmissions = projectArea * emissionFactor;

// Output with calculated value
outputDocument.credentialSubject.calculatedEmissions = totalEmissions;
```

## Development and Testing Workflow

### Guardian Savepoint Feature

Use Guardian's savepoint feature to save progress of forms or certification processes, then resume from that stage even after making policy changes and re-triggering dry runs.

**How to Use Savepoints**:

1. Complete part of a workflow (e.g., PDD submission)
2. Create savepoint before making policy changes
3. Modify policy blocks
4. Restore savepoint and continue testing

This prevents having to fill out long forms repeatedly during development.

### API Development vs Manual Forms

**Tip**: Using APIs to submit data is often faster than filling long forms manually during development.

**API Development Workflow**:

1. Fill form manually once with example values
2. Open Chrome DevTools → Network tab
3. Submit form and capture the request payload
4. Extract and modify payload for API testing

```javascript
// Use for API testing
await fetch(`/api/v1/policies/${policyId}/blocks/${blockId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(pddPayload)
});
```

## Custom Logic Block Testing

### Thorough Testing Approach

Test custom logic blocks thoroughly using Guardian's testing features. Make sure all edge cases are covered and output VC documents are correct.

**Testing Process**:

1. **Test with Minimal Data**: Ensure calculations work with required fields only
2. **Test with Maximum Data**: Verify calculations with all optional fields populated
3. **Test Edge Cases**: Zero values, negative values, missing optional data
4. **Validate Output Schema**: Ensure output VC document matches expected schema

### Document Version History

**Key Feature**: In the testing dialog, you can choose document versions from intermediate workflow steps.

For example, if your workflow is: `Document Submission → Tool 1 Processing → Tool 2 Processing → Final Calculation`

You can view intermediate document versions in the **History** tab of input data to debug calculation progressions.

![Custom Logic Testing Interface](<../../../.gitbook/assets/image (210).png>)

**Debugging Steps**:

1. Select intermediate document version from History tab
2. Run calculation with that specific version
3. Compare expected vs actual outputs
4. Identify where calculations diverge from expectations

## Document Flow Troubleshooting

### Missing Documents in UI

**Common Issue**: Document processing is successful, but documents don't appear in the relevant UI section.

**Root Cause**: This almost always indicates improper event hooking between workflow blocks.

**Debugging Process**:

1. **Check Event Configuration**: Verify source and target block events are properly configured
2. **Validate Event Propagation**: Ensure events flow from submission block to display block
3. **Review Block Permissions**: Confirm the viewing user has permissions for the target block

**Common Event Mistakes**:

* Missing event connections between blocks
* Incorrect event actor configuration (owner/issuer/initiator)
* Event disabled accidentally during policy editing
* Stop propagation is checked

### Event Debugging Checklist

When documents aren't appearing:

1. ✅ **Source Block Events**: Check if source block has output events configured
2. ✅ **Target Block Events**: Verify target block has matching input events
3. ✅ **Event Actor**: Confirm event actor matches document ownership
4. ✅ **Block Permissions**: Ensure viewing user has access to target block
5. ✅ **Policy State**: Verify policy is in correct state (published/dry run)
6. ✅ **Browser Cache**: Clear cache and refresh (sometimes needed for UI updates)

## Performance and Optimization

### Large Schema Performance

**Issue**: Forms with many fields (50+ fields) can load slowly and affect user experience.

**Solutions**:

* **Group Related Fields**: Use schema composition to break large schemas into logical sections
* **Conditional Fields**: Use conditional visibility to show only relevant fields
* **Progressive Disclosure**: Show basic fields first, advanced fields on demand

## Common Calculation Issues

### Precision and Rounding

**Issue**: JavaScript floating-point arithmetic can cause precision issues in calculations.

**Solution**: Use fixed decimal precision for monetary and emission calculations:

```javascript
// Problem: Floating point precision
const result = 0.1 + 0.2; // 0.30000000000000004

// Solution: Fixed precision
const emissionReductions = Math.round((baseline - project) * 100) / 100;
const monetaryValue = Math.round(emissionReductions * carbonPrice * 100) / 100;
```

### Missing Validation

**Issue**: Calculations proceed with invalid or missing input data.

**Solution**: Add comprehensive input and output document validation using documentValidatorBlock as well as within code. Use debug function provided to add debug logs to the code.

## Quick Reference Checklist

### Schema Development

* ✅ Use Excel-first approach for complex schemas
* ✅ Avoid re-importing identical schemas (creates duplicates)
* ✅ Edit field keys for readable calculation code
* ✅ Use custom logic blocks instead of auto-calculate for cross-schema references

### Development Workflow

* ✅ Use savepoints to preserve testing progress
* ✅ Capture API payloads from DevTools for faster testing
* ✅ Test custom logic blocks with all edge cases
* ✅ Use document history to debug calculation progressions

### Troubleshooting

* ✅ Check event propagation when documents don't appear
* ✅ Validate input data before calculations
* ✅ Use fixed precision for financial/emission calculations
* ✅ Add delays between bulk API operations

***

These practical tips can prevent many common issues and significantly speed up development. Remember that methodical debugging and thorough testing are key to successful Guardian implementations.
