import { EntityStatus, FormulaItemType, GenerateUUIDv4, IFormula, IFormulaConfig, IFormulaItem, IFormulaLink } from '@guardian/interfaces';

/**
 * Key of a formula document that does not exist yet and is created on save.
 */
export const NEW_FORMULA_DOCUMENT = 'new';

/**
 * Item types that can be shown on a schema field.
 */
export const BINDABLE_ITEM_TYPES: ReadonlySet<string> = new Set<string>([
    FormulaItemType.Variable,
    FormulaItemType.Formula,
    FormulaItemType.Text
]);

/**
 * A schema field as stored in a formula link: the root schema iri and the field path in it.
 */
export interface IFieldTarget {
    schemaIri: string;
    fieldPath: string;
}

/**
 * A change of the formula side made from the schema designer.
 */
export type FieldBindingOp =
    { type: 'bind'; formulaId: string; itemUuid: string; target: IFieldTarget } |
    { type: 'unbind'; formulaId: string; itemUuid: string; target: IFieldTarget } |
    { type: 'move'; formulaId: string; itemUuid: string; target: IFieldTarget; from: string } |
    { type: 'create'; formulaId: string; item: IFormulaItem; target: IFieldTarget };

/**
 * An item of a formula document shown on a field.
 */
export interface IFieldBinding {
    formula: IFormula;
    item: IFormulaItem;
}

/**
 * Path of a field in its root (document) schema, as stored in `IFormulaLink.item`:
 * the names of the sub-schema fields leading to it and its own name, joined by '.'.
 * Array sub-schemas add no index (`Schema` paths and form `fullPath`s have none).
 */
export function buildFieldPath(prefix: string[], name: string): string {
    return [...prefix, name].join('.');
}

/**
 * Links of the item. Items saved before `links` existed have `link` only.
 */
export function getItemLinks(item: IFormulaItem | null | undefined): IFormulaLink[] {
    if (Array.isArray(item?.links)) {
        return item!.links!.filter((link) => !!link);
    }
    return item?.link ? [item.link] : [];
}

/**
 * Sets the links of the item and mirrors the first one into `link` for readers that know only one link.
 */
export function setItemLinks(item: IFormulaItem, links: IFormulaLink[]): void {
    item.links = links;
    item.link = links[0] ?? null;
}

/**
 * Whether the link points to the field.
 */
export function isLinkedTo(link: IFormulaLink | null | undefined, target: IFieldTarget): boolean {
    return !!link &&
        link.type === 'schema' &&
        link.entityId === target.schemaIri &&
        link.item === target.fieldPath;
}

/**
 * Builds the link to the field. The display condition is kept only when the old link
 * is on the same schema, because its paths are relative to that schema.
 */
export function moveLink(link: IFormulaLink | null | undefined, target: IFieldTarget): IFormulaLink {
    const result: IFormulaLink = {
        type: 'schema',
        entityId: target.schemaIri,
        item: target.fieldPath
    };
    if (link && link.type === 'schema' && link.entityId === target.schemaIri && link.condition) {
        result.condition = link.condition;
    }
    return result;
}

/**
 * Formula documents whose items can still be changed.
 */
export function isEditableFormula(formula: IFormula | null | undefined): boolean {
    return formula?.status === EntityStatus.DRAFT || formula?.status === EntityStatus.DRY_RUN;
}

/**
 * A placeholder formula item. Its link is set when the create operation is applied.
 */
export function createStubItem(name: string, uuid: string = GenerateUUIDv4()): IFormulaItem {
    return {
        uuid,
        name,
        description: '',
        type: FormulaItemType.Formula,
        value: '',
        relationships: [],
        link: null,
        links: []
    };
}

function isSameLink(a: IFormulaLink, b: IFormulaLink): boolean {
    return a.type === b.type && a.entityId === b.entityId && a.item === b.item;
}

function withLinks(item: IFormulaItem, links: IFormulaLink[]): IFormulaItem {
    const copy: IFormulaItem = { ...item };
    setItemLinks(copy, links);
    return copy;
}

/**
 * Applies the operations to a copy of the config. The input is not changed.
 * `skipped` lists the operations whose item no longer exists in the config.
 */
export function applyFieldBindingOps(
    config: IFormulaConfig | null | undefined,
    ops: FieldBindingOp[]
): { config: IFormulaConfig; skipped: FieldBindingOp[] } {
    const formulas: IFormulaItem[] = Array.isArray(config?.formulas) ? [...config!.formulas!] : [];
    const result: IFormulaConfig = { ...(config || {}), formulas };
    const skipped: FieldBindingOp[] = [];
    const indexOf = (uuid: string) => formulas.findIndex((item) => item?.uuid === uuid);
    for (const op of ops) {
        if (op.type === 'create') {
            if (indexOf(op.item.uuid) === -1) {
                formulas.push(withLinks(op.item, [moveLink(null, op.target)]));
            }
            continue;
        }
        const index = indexOf(op.itemUuid);
        if (index === -1) {
            if (op.type === 'bind') {
                skipped.push(op);
            }
            continue;
        }
        const item = formulas[index];
        const links = getItemLinks(item);
        if (op.type === 'bind') {
            if (!links.some((link) => isLinkedTo(link, op.target))) {
                formulas[index] = withLinks(item, [...links, moveLink(null, op.target)]);
            }
        } else if (op.type === 'move') {
            if (op.from === op.target.fieldPath) {
                continue;
            }
            const from = { ...op.target, fieldPath: op.from };
            if (!links.some((link) => isLinkedTo(link, from))) {
                continue;
            }
            const kept: IFormulaLink[] = [];
            for (const link of links) {
                if (!isLinkedTo(link, from)) {
                    kept.push(link);
                    continue;
                }
                const next = moveLink(link, op.target);
                const taken = links.some((other) => !isLinkedTo(other, from) && isSameLink(other, next)) ||
                    kept.some((other) => isSameLink(other, next));
                if (!taken) {
                    kept.push(next);
                }
            }
            formulas[index] = withLinks(item, kept);
        } else if (links.some((link) => isLinkedTo(link, op.target))) {
            formulas[index] = withLinks(item, links.filter((link) => !isLinkedTo(link, op.target)));
        }
    }
    return { config: result, skipped };
}

/**
 * Formula documents with the pending operations applied. Documents without operations
 * are returned as is; a document for `NEW_FORMULA_DOCUMENT` is added when needed.
 */
export function applyFieldBindingOpsToFormulas(
    formulas: IFormula[],
    ops: FieldBindingOp[],
    newDocument: () => IFormula
): IFormula[] {
    if (!ops.length) {
        return formulas;
    }
    const result = formulas.map((formula) => {
        const own = ops.filter((op) => op.formulaId === formula.id);
        if (!own.length) {
            return formula;
        }
        return { ...formula, config: applyFieldBindingOps(formula.config, own).config };
    });
    const created = ops.filter((op) => op.formulaId === NEW_FORMULA_DOCUMENT);
    if (created.length) {
        const doc = newDocument();
        result.push({ ...doc, id: NEW_FORMULA_DOCUMENT, config: applyFieldBindingOps(doc.config, created).config });
    }
    return result;
}

/**
 * Items of the formula documents shown on the field.
 */
export function findFieldBindings(formulas: IFormula[], target: IFieldTarget): IFieldBinding[] {
    const result: IFieldBinding[] = [];
    for (const formula of formulas) {
        for (const item of formula.config?.formulas || []) {
            if (item && BINDABLE_ITEM_TYPES.has(item.type) && getItemLinks(item).some((link) => isLinkedTo(link, target))) {
                result.push({ formula, item });
            }
        }
    }
    return result;
}
