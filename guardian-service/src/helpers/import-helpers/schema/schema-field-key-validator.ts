import { ISchema, Schema, SchemaField } from '@guardian/interfaces';

const RESERVED_FIELD_KEY_CHARACTERS = ['.', ':'];

function fieldLabel(field: SchemaField): string {
    return field.description || field.title || field.name || 'unnamed field';
}

function collectInvalidFieldKeys(
    fields: SchemaField[],
    path: string[] = [],
    errors: string[] = []
): string[] {
    for (const field of fields || []) {
        const currentPath = [...path, fieldLabel(field)];
        const key = field.name || '';
        const reserved = RESERVED_FIELD_KEY_CHARACTERS.find((character) => key.includes(character));
        if (reserved) {
            errors.push(
                `Field key "${key}" (${currentPath.join(' > ')}) contains reserved character "${reserved}". ` +
                `Field keys must not contain reserved characters such as "." or ":".`
            );
        }
        if (Array.isArray(field.fields)) {
            collectInvalidFieldKeys(field.fields, currentPath, errors);
        }
    }
    return errors;
}

export function validateSchemaFieldKeys(schema: ISchema): void {
    const fields = Array.isArray((schema as any).fields)
        ? (schema as any).fields
        : (new Schema(schema, true).fields || []);
    const errors = collectInvalidFieldKeys(fields);
    if (errors.length) {
        throw new Error(errors.join(' '));
    }
}
