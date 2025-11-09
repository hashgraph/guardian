import { TreeNode } from '../../common/tree-graph/tree-node';
import { TreeSource } from '../../common/tree-graph/tree-source';
import { IFormula, IFormulaItem, IFormulaLink, IFormulaConfig } from '@guardian/interfaces';

export type FormulaNodeKind = 'formula' | 'item' | 'schema-field';

export interface FormulaNodeData {
    kind: FormulaNodeKind;
    label: string;
    ref?: {
        formulaId?: string;
        itemUuid?: string;
        schemaId?: string;
        path?: string;
    };
}

export class FormulaNode extends TreeNode<FormulaNodeData> {
    constructor(data: FormulaNodeData) {
        const id =
            data.ref?.formulaId ||
            data.ref?.itemUuid ||
            data.ref?.schemaId ||
            data.label;
        const type: 'root' | 'sub' | null =
            data.kind === 'formula' ? 'root' : 'sub';
        super(id, type, data);
    }
}

export function buildFormulaGraph(
    root: IFormula,
    all: IFormula[],
    schemas: Array<any>
): TreeSource<FormulaNode> {
    const indexById = new Map<string, IFormula>();
    for (const f of all) {
        if (f?.id) {
            indexById.set(String(f.id), f);
        }
        if (f?.uuid) {
            indexById.set(String(f.uuid), f);
        }
    }
    if (root?.id) {
        indexById.set(String(root.id), root);
    }
    if (root?.uuid) {
        indexById.set(String(root.uuid), root);
    }

    const roots: FormulaNode[] = [];
    const visited = new Set<string>();

    const rootNode = new FormulaNode({
        kind: 'formula',
        label: root?.name || 'Formula',
        ref: { formulaId: String(root?.id || root?.uuid || '') }
    });
    roots.push(rootNode);

    const cfg: IFormulaConfig | undefined = root?.config;
    const items: IFormulaItem[] = cfg?.formulas || [];

    for (const item of items) {
        const child = buildItemNode(item, indexById, schemas, visited);
        if (child) {
            rootNode.addChild(child);
        }
    }

    return new TreeSource<FormulaNode>(roots);
}

function buildItemNode(
    item: IFormulaItem,
    indexById: Map<string, IFormula>,
    schemas: Array<any>,
    visited: Set<string>
): FormulaNode | null {
    if (!item) {
        return null;
    }
    const itemNode = new FormulaNode({
        kind: 'item',
        label: item.name || item.uuid || 'item',
        ref: { itemUuid: item.uuid }
    });

    if (item.link) {
        const linkNode = resolveLinkNode(item.link, indexById, schemas, visited);
        if (linkNode) {
            itemNode.addChild(linkNode);
        }
    }

    if (item.relationships && Array.isArray(item.relationships)) {
        for (const rel of item.relationships) {
            const relNode = new FormulaNode({
                kind: 'item',
                label: rel,
                ref: { itemUuid: rel }
            });
            itemNode.addChild(relNode);
        }
    }

    return itemNode;
}

function resolveLinkNode(
    link: IFormulaLink,
    indexById: Map<string, IFormula>,
    schemas: Array<any>,
    visited: Set<string>
): FormulaNode | null {
    if (!link) {
        return null;
    }

    if (link.type === 'formula') {
        const target = indexById.get(String(link.entityId));
        if (!target) {
            return new FormulaNode({ kind: 'formula', label: `Missing formula ${link.entityId}` });
        }

        const key = `f:${String(target.id || target.uuid)}`;
        if (visited.has(key)) {
            return new FormulaNode({ kind: 'formula', label: `${target.name || 'Formula'} (cycle)` });
        }

        visited.add(key);

        const node = new FormulaNode({
            kind: 'formula',
            label: target.name || 'Formula',
            ref: { formulaId: String(target.id || target.uuid) }
        });

        const items: IFormulaItem[] = target?.config?.formulas || [];
        for (const i of items) {
            const child = buildItemNode(i, indexById, schemas, visited);
            if (child) {
                node.addChild(child);
            }
        }
        return node;
    }

    if (link.type === 'schema') {
        const schema = schemas?.find(
            (s) =>
                String(s.id) === String(link.entityId) ||
                String(s.iri) === String(link.entityId)
        );
        const label = schema
            ? `${schema.name || 'Schema'}.${link.item}`
            : `Schema[${link.entityId}].${link.item}`;
        return new FormulaNode({
            kind: 'schema-field',
            label,
            ref: { schemaId: String(link.entityId), path: link.item }
        });
    }

    return null;
}
