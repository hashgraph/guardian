import { DatabaseServer } from '@guardian/common';
import { ISchema, Schema, SchemaHelper } from '@guardian/interfaces';

/**
 * Formula link that points to a schema field which does not exist
 */
export interface IFormulaLinkWarning {
    text: string;
    schemaIri: string;
    path: string;
}

/**
 * Warnings of one schema that can be replaced
 */
export interface ISchemaFormulaWarnings {
    schemaId: string;
    warnings: IFormulaLinkWarning[];
}

/**
 * Field paths of schemas by schema IRI
 */
export type SchemaFieldPaths = Map<string, Set<string>>;

/**
 * Get paths of all fields of the schema (`a.b.c`, array sub-schemas add no index)
 * @param schema
 */
export function getSchemaFieldPaths(schema: ISchema): Set<string> {
    return new Set(new Schema(schema).getFields().map((field) => field.path));
}

function getLinks(item: any): any[] {
    if (Array.isArray(item?.links)) {
        return item.links;
    }
    return item?.link ? [item.link] : [];
}

function getPredicatePath(predicate: any): string {
    if (Array.isArray(predicate?.fieldPath) && predicate.fieldPath.length) {
        return predicate.fieldPath.join('.');
    }
    return predicate?.field?.fullPath || predicate?.field?.path || predicate?.field?.name || '';
}

/**
 * Paths a link refers to: its field and the fields of its display condition
 */
function getLinkPaths(link: any): Map<string, string> {
    const paths = new Map<string, string>();
    if (link.item) {
        paths.set(link.item, 'field');
    }
    for (const predicate of SchemaHelper.getConditionTriggerPredicates(link.condition)) {
        const path = getPredicatePath(predicate);
        if (path && !paths.has(path)) {
            paths.set(path, 'display condition field');
        }
    }
    return paths;
}

/**
 * Find formula links, which point to missing fields
 * @param formulas formulas of the policy
 * @param schemas field paths of schemas to check against
 * @param baseline field paths before the change, when set only paths that exist there are reported
 */
export function findBrokenFormulaLinks(
    formulas: any[],
    schemas: SchemaFieldPaths,
    baseline?: SchemaFieldPaths
): IFormulaLinkWarning[] {
    const result: IFormulaLinkWarning[] = [];
    for (const formula of formulas || []) {
        for (const item of formula?.config?.formulas || []) {
            for (const link of getLinks(item)) {
                const paths = link?.type === 'schema' ? schemas.get(link.entityId) : null;
                if (!paths) {
                    continue;
                }
                const before = baseline?.get(link.entityId);
                for (const [path, kind] of getLinkPaths(link)) {
                    if (paths.has(path) || (before && !before.has(path))) {
                        continue;
                    }
                    result.push({
                        text: `Formula "${formula.name}", item "${item.name}": ${kind} "${path}" will no longer exist in the schema.`,
                        schemaIri: link.entityId,
                        path
                    });
                }
            }
        }
    }
    return result;
}

/**
 * Check what replacing schemas breaks in the formulas of the policy
 * @param topicId policy topic
 * @param replaceable existing schemas, which can be replaced
 * @param incoming schemas from the import
 */
export async function validateFormulaLinksForReplace(
    topicId: string,
    replaceable: ISchema[],
    incoming: ISchema[]
): Promise<ISchemaFormulaWarnings[]> {
    const policy = await DatabaseServer.getPolicy({ topicId });
    const formulas = policy ? await DatabaseServer.getFormulas({ policyId: policy.id } as any) : [];
    if (!formulas.length) {
        return [];
    }
    const incomingByName = new Map((incoming || []).map((schema) => [schema?.name, schema]));
    const baseline: SchemaFieldPaths = new Map();
    const schemas: SchemaFieldPaths = new Map();
    const idByIri = new Map<string, string>();
    for (const existing of replaceable) {
        const next = incomingByName.get(existing.name);
        if (!next?.document || !existing.iri) {
            continue;
        }
        baseline.set(existing.iri, getSchemaFieldPaths(existing));
        schemas.set(existing.iri, getSchemaFieldPaths(next));
        idByIri.set(existing.iri, existing.id);
    }
    const grouped = new Map<string, IFormulaLinkWarning[]>();
    for (const warning of findBrokenFormulaLinks(formulas, schemas, baseline)) {
        const list = grouped.get(warning.schemaIri) || [];
        list.push(warning);
        grouped.set(warning.schemaIri, list);
    }
    return Array.from(grouped, ([iri, warnings]) => ({ schemaId: idByIri.get(iri), warnings }));
}

/**
 * Check formula links to imported schemas after the import
 * @param policyId policy
 * @param topicId policy topic
 * @param iris imported schema IRIs
 */
export async function validateFormulaLinksAfterImport(
    policyId: string,
    topicId: string,
    iris: string[]
): Promise<IFormulaLinkWarning[]> {
    if (!iris?.length) {
        return [];
    }
    const [formulas, rows] = await Promise.all([
        DatabaseServer.getFormulas({ policyId } as any),
        DatabaseServer.getSchemas({ topicId, iri: { $in: iris } } as any)
    ]);
    if (!formulas.length) {
        return [];
    }
    const schemas: SchemaFieldPaths = new Map();
    for (const row of rows) {
        schemas.set(row.iri, getSchemaFieldPaths(row));
    }
    return findBrokenFormulaLinks(formulas, schemas);
}
