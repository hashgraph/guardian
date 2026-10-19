import { isDeepStrictEqual } from 'node:util';

/**
 * Policy fields the Schema Rules, Statistics and Policy Labels editors need.
 */
const POLICY_FIELDS = [
    'id',
    'uuid',
    'name',
    'description',
    'version',
    'status',
    'topicId',
    'instanceTopicId',
    'messageId',
    'owner',
    'creator'
];

/**
 * Leave only the lightweight policy fields (no config, no hash map).
 * @param policy policy
 */
export function pickRelationshipsPolicy(policy: any): any {
    const result: any = {};
    for (const field of POLICY_FIELDS) {
        if (policy[field] !== undefined) {
            result[field] = policy[field];
        }
    }
    return result;
}

/**
 * Get the schema document as an object.
 * @param schema schema
 */
function getDocument(schema: any): any {
    if (!schema) {
        return null;
    }
    if (typeof schema.document === 'string') {
        try {
            return JSON.parse(schema.document);
        } catch {
            return null;
        }
    }
    return schema.document;
}

/**
 * Get the iris of the schemas that the document refers to.
 * @param schema schema
 */
function getDefs(schema: any): string[] {
    const defs = getDocument(schema)?.$defs;
    return defs && typeof defs === 'object' ? Object.keys(defs) : [];
}

/**
 * Shape schemas for the Schema Rules, Statistics and Policy Labels editors:
 * - keep root schemas (VC or system) and the sub-schemas they reach transitively;
 * - drop `context` (not used by the editor);
 * - move the `$defs` copies out of the documents (`defs` keeps their keys, the
 *   definitions are the documents of the sub-schemas, which are in the list).
 * `$defs` stays inline when it cannot be restored exactly from the list.
 * @param schemas published schemas
 */
export function buildRelationshipsSchemas(schemas: any[]): any[] {
    const byIri = new Map<string, any>();
    for (const schema of schemas) {
        if (schema.iri && !byIri.has(schema.iri)) {
            byIri.set(schema.iri, schema);
        }
    }

    const reachable = new Set<any>();
    const queue = schemas.filter((s) => s.entity === 'VC' || s.category === 'SYSTEM');
    while (queue.length) {
        const schema = queue.pop();
        if (reachable.has(schema)) {
            continue;
        }
        reachable.add(schema);
        for (const iri of getDefs(schema)) {
            const sub = byIri.get(iri);
            if (sub) {
                queue.push(sub);
            }
        }
    }

    const result: any[] = [];
    for (const schema of schemas) {
        if (!reachable.has(schema)) {
            continue;
        }
        const { context, ...item } = schema;
        // `id` is a getter on the entity, so the spread does not copy it
        item.id = schema.id;
        const document = getDocument(schema);
        const defs = document?.$defs;
        const keys = defs && typeof defs === 'object' ? Object.keys(defs) : [];
        if (keys.length) {
            const restorable = keys.every((iri) => {
                const sub = getDocument(byIri.get(iri));
                if (!sub) {
                    return false;
                }
                const { $defs, ...rest } = sub;
                return isDeepStrictEqual(rest, defs[iri]);
            });
            if (restorable) {
                const { $defs, ...rest } = document;
                item.document = rest;
                item.defs = keys;
            }
        }
        result.push(item);
    }
    return result;
}
