import type { SchemaField } from '@guardian/interfaces';

interface IPreviewSchema {
    fields: SchemaField[];
}

interface IPreviewSchemaResponse {
    sameSchema: boolean;
    documents: { document: unknown; final: boolean; sameSchema?: boolean }[];
}

export function haveSamePreviewFields(left: SchemaField[], right: SchemaField[]): boolean {
    if (left.length !== right.length) {
        return false;
    }
    const fields = new Map(right.map((field) => [field.name, field]));
    return left.every((field) => {
        const other = fields.get(field.name);
        if (!other || !!field.isArray !== !!other.isArray || !!field.isRef !== !!other.isRef) {
            return false;
        }
        if (field.isRef) {
            return Array.isArray(field.fields) && Array.isArray(other.fields)
                && haveSamePreviewFields(field.fields, other.fields);
        }
        return field.type === other.type && (field.format ?? null) === (other.format ?? null)
            && (field.customType ?? null) === (other.customType ?? null);
    });
}

function getOutputSchema(record: unknown): string | null {
    if (!record || typeof record !== 'object') {
        return null;
    }
    const document = Reflect.get(record, 'document');
    const subjects = document && typeof document === 'object' ? Reflect.get(document, 'credentialSubject') : null;
    const subject = Array.isArray(subjects) ? subjects[0] : subjects;
    const type = subject && typeof subject === 'object' ? Reflect.get(subject, 'type') : null;
    const types = Array.isArray(type) ? type : [type];
    const schema = types.find((value) => typeof value === 'string' && value.length);
    if (typeof schema === 'string') {
        return schema.startsWith('#') ? schema : `#${schema}`;
    }
    return null;
}

export async function setPreviewSchemaMatches(
    response: IPreviewSchemaResponse,
    inputSchema: string | null,
    load: (id: string) => Promise<IPreviewSchema | null>
): Promise<void> {
    response.sameSchema = false;
    const finals = response.documents.filter((item) => item.final);
    for (const item of finals) {
        item.sameSchema = false;
    }
    if (!inputSchema || !finals.length) {
        return;
    }
    const schemas = new Map<string, Promise<IPreviewSchema | null>>();
    const get = (id: string) => {
        let schema = schemas.get(id);
        if (!schema) {
            schema = load(id);
            schemas.set(id, schema);
        }
        return schema;
    };
    const input = await get(inputSchema);
    if (!input) {
        return;
    }
    for (const item of finals) {
        const id = getOutputSchema(item.document);
        const output = id ? await get(id) : null;
        item.sameSchema = !!output && haveSamePreviewFields(input.fields, output.fields);
        response.sameSchema ||= item.sameSchema;
    }
}
