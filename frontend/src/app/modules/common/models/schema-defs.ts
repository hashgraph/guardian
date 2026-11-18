/**
 * The server sends `$defs` of the relationships schemas once, as the sub-schemas themselves
 * (`defs` lists their iris). Put the definitions back into the documents.
 * @param schemas relationships schemas
 * @returns the same schemas with restored `$defs`
 */
export function restoreSchemaDefs(schemas: any[]): any[] {
    const referenced = new Set<string>();
    for (const schema of schemas) {
        if (Array.isArray(schema.defs)) {
            for (const iri of schema.defs) {
                referenced.add(iri);
            }
        }
    }
    const documents = new Map<string, any>();
    for (const schema of schemas) {
        if (schema.iri && schema.document && referenced.has(schema.iri)) {
            const { $defs, ...document } = schema.document;
            documents.set(schema.iri, document);
        }
    }
    for (const schema of schemas) {
        if (schema.document && !schema.document.$defs && Array.isArray(schema.defs) && schema.defs.length) {
            const $defs: any = {};
            for (const iri of schema.defs) {
                if (documents.has(iri)) {
                    $defs[iri] = documents.get(iri);
                }
            }
            schema.document = { ...schema.document, $defs };
        }
    }
    return schemas;
}

/**
 * Names of the relationships schemas by iri (or by id when a schema has no iri).
 * @param schemas relationships schemas
 * @returns schema names
 */
export function buildSchemaNames(schemas: any[]): Map<string, string> {
    const names = new Map<string, string>();
    for (const schema of schemas) {
        const key = schema.iri || schema.id;
        if (key) {
            names.set(key, schema.name || '');
        }
    }
    return names;
}
