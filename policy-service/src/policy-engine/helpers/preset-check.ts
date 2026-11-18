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
    for (const field of readonly) {
        // The form does not fill an incompatible mapping, so there is no value to compare
        if (!PresetPath.isCompatible(field)) {
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
        // A field hidden by a false condition is legitimately absent from the document
        if (
            (actual === undefined || actual === null) &&
            SchemaHelper.isFieldHiddenByConditions(
                schema?.conditions,
                document,
                PresetPath.root(field.name)
            )
        ) {
            continue;
        }
        if (!deepEqual(actual, expected)) {
            return {
                error: `Readonly preset field (${field.name}) can not be modified.`,
                valid: false,
            };
        }
    }

    return { valid: true };
}
