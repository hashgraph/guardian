import { CheckResult, PresetPath, removeObjectProperties, SchemaHelper } from '@guardian/interfaces';
import { VcDocument as VcDocumentCollection } from '@guardian/common/entity/vc-document';
import deepEqual from 'deep-equal';
import { PolicyUtils } from './utils.js';

/**
 * Checks that the readonly preset fields of a request were not modified.
 * Used by the request block and by its addon.
 * @param options block options (`presetSchema`, `presetFields`)
 * @param schema schema of the block (its fields and conditions)
 * @param document submitted document
 * @param documentRef preset document
 */
export function checkReadonlyPreset(
    options: any,
    schema: any,
    document: any,
    documentRef: VcDocumentCollection
): CheckResult {
    if (
        !options.presetFields ||
        !options.presetFields.length ||
        !options.presetSchema
    ) {
        return { valid: true };
    }

    const readonly = options.presetFields.filter(
        (item: any) => item.readonly && item.value
    );
    if (!readonly.length || !document || !documentRef) {
        return { valid: true };
    }

    const presetDocument = PolicyUtils.getCredentialSubject(documentRef);
    if (!presetDocument) {
        return {
            error: 'Readonly preset fields can not be verified.',
            valid: false,
        };
    }

    const presetDocumentCopy = removeObjectProperties(
        ['@context'],
        JSON.parse(JSON.stringify(presetDocument))
    );
    // Conditions are evaluated on the submitted document with the readonly preset values on top.
    // A readonly value the user can not change must not be dodged by editing the condition input
    const hiddenCheckDocument = withReadonlyValues(document, readonly, presetDocumentCopy, schema);
    for (const field of readonly) {
        // The form does not fill an incompatible nested mapping, so there is no value to compare.
        // A plain root mapping is always copied as before
        if (PresetPath.isNested(field) && !PresetPath.isCompatible(field)) {
            continue;
        }
        const nested = PresetPath.isNested(field);
        const actualRaw = nested
            ? PresetPath.read(document, field.name)
            : document[field.name];
        const expectedRaw = nested
            ? PresetPath.sourceValue(presetDocumentCopy, field)
            : presetDocumentCopy[field.value];
        // The submitted document is already stamped with this schema's `type`/`@context`
        // on sub-schema objects, the preset has the other schema's: compare data only
        const targetField = PresetPath.findField(schema?.fields, field.name);
        const actual = PresetPath.withoutSystemKeys(actualRaw, targetField);
        const expected = PresetPath.withoutSystemKeys(expectedRaw, targetField);
        // A field hidden by a false condition is legitimately absent from the document.
        // This is decided per entry, so one hidden row does not excuse the others
        const mask = hiddenMask(schema?.conditions, schema?.fields, hiddenCheckDocument, field.name);
        const expectedChecked = alignHidden(actual, expected, mask);
        if (!deepEqual(trimPadding(actual, expectedChecked), expectedChecked)) {
            return {
                error: `Readonly preset field (${field.name}) can not be modified.`,
                valid: false,
            };
        }
    }

    return { valid: true };
}

/**
 * True for a missing value, or for a list whose entries are all missing (an array path
 * where every entry hides the field).
 */
function isEmpty(value: any): boolean {
    if (Array.isArray(value)) {
        return value.length > 0 && value.every(isEmpty);
    }
    return value === undefined || value === null;
}

/**
 * Submitted document with the readonly preset values written over it (user values are unknown here).
 */
function withReadonlyValues(document: any, readonly: any[], presetDocument: any, schema: any): any {
    const mappings = readonly.filter(
        (item: any) => item.value !== 'username' && item.value !== 'hederaAccountId'
    );
    const filled = PresetPath.fill(presetDocument, mappings, schema?.fields, {});
    const merged = JSON.parse(JSON.stringify(document));
    for (const mapping of mappings) {
        if (!PresetPath.isNested(mapping)) {
            if (filled[mapping.name] !== undefined) {
                merged[mapping.name] = filled[mapping.name];
            }
        } else if (PresetPath.isCompatible(mapping)) {
            const value = PresetPath.sourceValue(presetDocument, mapping);
            if (value !== undefined) {
                PresetPath.write(merged, schema?.fields, mapping.name, value);
            }
        }
    }
    return merged;
}

/**
 * Marks where the field at a dotted path is hidden by a false condition, at the root schema or
 * in a sub-schema. The result has the shape of `PresetPath.read`: one list level per array.
 */
function hiddenMask(
    conditions: any[] | null | undefined,
    fields: any[] | null | undefined,
    data: any,
    path: string
): any {
    if (Array.isArray(data)) {
        return data.map((entry) => hiddenMask(conditions, fields, entry, path));
    }
    if (!data || typeof data !== 'object') {
        return false;
    }
    const [head, ...rest] = String(path).split('.');
    if (SchemaHelper.isFieldHiddenByConditions(conditions, data, head)) {
        return true;
    }
    if (!rest.length) {
        return false;
    }
    const child = (fields || []).find((item: any) => item.name === head);
    if (!child || data[head] === undefined || data[head] === null) {
        return false;
    }
    return hiddenMask(child.conditions, child.fields, data[head], rest.join('.'));
}

/**
 * Expected value where the hidden entries expect nothing: they take the submitted value
 * if it is missing. A value sent for a hidden field is still compared with the preset.
 */
function alignHidden(actual: any, expected: any, mask: any): any {
    if (mask === true) {
        return isEmpty(actual) ? actual : expected;
    }
    if (Array.isArray(mask) && Array.isArray(expected)) {
        return expected.map((item, index) =>
            alignHidden(Array.isArray(actual) ? actual[index] : undefined, item, mask[index])
        );
    }
    return expected;
}

/**
 * Drops the trailing missing entries of the submitted value beyond the expected length.
 * Two mappings into one target array from sources of different length make the form create
 * as many entries as the longer source, so the shorter one reads as missing there.
 * A value in such an entry is kept, so it is still compared (and rejected).
 */
function trimPadding(actual: any, expected: any): any {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
        return actual;
    }
    let end = actual.length;
    while (end > expected.length && isEmpty(actual[end - 1])) {
        end--;
    }
    return actual.slice(0, end).map((item, index) => trimPadding(item, expected[index]));
}
