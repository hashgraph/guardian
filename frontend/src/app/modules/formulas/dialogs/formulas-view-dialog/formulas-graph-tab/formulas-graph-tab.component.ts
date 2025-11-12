import {
    Component,
    Input,
    OnInit,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import {
    FormulasTree,
    FormulaItem,
    SchemaItem,
} from '../../../models/formula-tree';
import { TreeGraphComponent } from 'src/app/modules/common/tree-graph/tree-graph.component';
import { TreeNode } from 'src/app/modules/common/tree-graph/tree-node';
import { TreeSource } from 'src/app/modules/common/tree-graph/tree-source';

type ValueStatus = 'missing' | 'default' | 'asSuggested' | 'notNull';
type ValueKind = 'scalar' | 'data-structure';

interface GraphNodeData {
    title: string;
    payload: FormulaItem | SchemaItem | any;
    valueStatus: ValueStatus | null;
}

class GraphNode extends TreeNode<GraphNodeData> {
    constructor(
        id: string,
        type: 'root' | 'sub',
        data: GraphNodeData,
    ) {
        super(id, type, data);
    }
}

@Component({
    selector: 'formulas-graph-tab',
    templateUrl: './formulas-graph-tab.component.html',
    styleUrls: ['./formulas-graph-tab.component.scss'],
})
export class FormulasGraphTabComponent implements OnInit, OnChanges {
    @Input()
    public tree!: FormulasTree;

    @Input()
    public schema!: string;

    @Input()
    public path!: string;

    public hasData: boolean = false;
    public source: TreeSource<GraphNode> | null = null;

    private treeGraph: TreeGraphComponent | null = null;

    public selectedNode: GraphNode | null = null;
    public selectedItem: FormulaItem | SchemaItem | null = null;
    public selectedTitle: string = '';

    public nodeDocument: string | null = null;
    public parentDocuments: string[] = [];
    public fieldName: string | null = null;
    public fieldPath: string | null = null;

    public mainValue: string | null = null;
    public mainValueLabel: string | null = null;
    public fieldValue: any = null;

    public schemaDefault: any = null;
    public schemaSuggested: any = null;
    public valueStatus: ValueStatus | null = null;
    public valueKind: ValueKind | null = null;

    public ngOnInit(): void {
        this.buildGraph();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        const treeChanged: boolean = 'tree' in changes;
        const schemaChanged: boolean = 'schema' in changes;
        const pathChanged: boolean = 'path' in changes;

        if (treeChanged || schemaChanged || pathChanged) {
            this.buildGraph();
        }
    }

    private buildGraph(): void {
        this.hasData = false;
        this.source = null;

        if (!this.tree || !this.schema || !this.path) {
            return;
        }

        const items: FormulaItem[] = this.tree.get(this.schema, this.path) || [];

        if (!items || !items.length) {
            return;
        }

        const navigationTree: any = FormulasTree.createNav(items);
        const graphNodes: GraphNode[] = [];

        const walkNavigationTree = (
            navigationNode: any,
            parentGraphNode: GraphNode | null,
        ): void => {
            if (!navigationNode) {
                return;
            }

            const isComponentNode: boolean =
                String(navigationNode.view || '').toLowerCase() === 'component';

            let currentParentGraphNode: GraphNode | null = parentGraphNode;

            if (isComponentNode) {
                const nodeId: string =
                    navigationNode.id || `n-${graphNodes.length}`;
                const nodeType: 'root' | 'sub' =
                    parentGraphNode ? 'sub' : 'root';

                const nodeValueStatus: ValueStatus | null =
                    this.getNodeValueStatusFromPayload(navigationNode.data);

                const nodeData: GraphNodeData = {
                    title: this.buildTitle(navigationNode),
                    payload: navigationNode.data,
                    valueStatus: nodeValueStatus,
                };

                const graphNode: GraphNode = new GraphNode(
                    nodeId,
                    nodeType,
                    nodeData,
                );

                graphNodes.push(graphNode);

                if (parentGraphNode) {
                    parentGraphNode.addId(graphNode.id);
                }

                currentParentGraphNode = graphNode;
            }

            if (Array.isArray(navigationNode.children)) {
                for (const childNode of navigationNode.children) {
                    walkNavigationTree(childNode, currentParentGraphNode);
                }
            }
        };

        if (
            Array.isArray(navigationTree.children) &&
            navigationTree.children.length
        ) {
            for (const childNode of navigationTree.children) {
                walkNavigationTree(childNode, null);
            }
        } else {
            walkNavigationTree(navigationTree, null);
        }

        if (!graphNodes.length) {
            return;
        }

        this.source = new TreeSource<GraphNode>(graphNodes);
        this.hasData = true;

        if (this.treeGraph && this.source) {
            this.treeGraph.setData(this.source);
            this.treeGraph.move(18, 46);
        }
    }

    private buildTitle(navigationNode: any): string {
        const nodeType: string = navigationNode.type || '';
        const nodeName: string = navigationNode.name || '';

        if (nodeType && nodeName) {
            return `${nodeType}: ${nodeName}`;
        }

        if (nodeName) {
            return nodeName;
        }

        if (nodeType) {
            return nodeType;
        }

        return 'Item';
    }

    public initGraph(treeGraphComponent: TreeGraphComponent): void {
        this.treeGraph = treeGraphComponent;

        if (this.source) {
            this.treeGraph.setData(this.source);
        }
    }

    public onRender(): void {
        return;
    }

    public onSelect(node: TreeNode<GraphNodeData> | null): void {
        if (!node) {
            this.clearSelection();
            return;
        }

        this.selectedNode = node as GraphNode;
        this.selectedItem = node.data.payload as any;
        this.selectedTitle = node.data.title;

        const payload: any = node.data.payload || {};

        this.mainValue = this.getItemMainValue(payload) || null;
        this.mainValueLabel = this.getItemMainValueLabel(payload) || null;

        this.nodeDocument =
            payload?.linkEntityName ||
            payload?.entity ||
            payload?._linkEntity?.name ||
            null;

        this.fieldName =
            payload?.linkItemName ||
            payload?._linkItem?.name ||
            null;

        this.fieldValue = null;
        this.fieldPath = null;
        this.schemaDefault = null;
        this.schemaSuggested = null;
        this.valueStatus = null;
        this.valueKind = null;

        const linkItem: any = payload._linkItem || payload.linkItem;

        if (linkItem) {
            this.fieldValue =
                linkItem.value ??
                linkItem._value ??
                linkItem.example ??
                null;

            if (this.isEmptyValue(this.fieldValue)) {
                this.fieldValue = null;
            }

            const fieldMeta: any = linkItem._field || linkItem.field || {};
            const rawSchemaField: any = this.resolveSchemaFieldFromLink(linkItem);

            const metaComment: any =
                fieldMeta.$comment !== undefined
                    ? fieldMeta.$comment
                    : fieldMeta.comment;

            const schemaComment: any =
                rawSchemaField && (rawSchemaField.$comment || rawSchemaField.comment);

            this.fieldPath =
                linkItem._path ||
                linkItem.path ||
                linkItem.schemaPath ||
                fieldMeta.path ||
                null;

            if (!this.fieldPath) {
                const fullPath: string | undefined =
                    fieldMeta.fullPath || rawSchemaField?.fullPath;

                if (fullPath) {
                    const slashIndex: number = fullPath.indexOf('/');
                    this.fieldPath =
                        slashIndex >= 0
                            ? fullPath.substring(slashIndex + 1)
                            : fullPath;
                }
            }

            if (fieldMeta.default !== undefined) {
                this.schemaDefault = fieldMeta.default;
            } else if (rawSchemaField && rawSchemaField.default !== undefined) {
                this.schemaDefault = rawSchemaField.default;
            } else {
                this.schemaDefault = null;
            }

            const directSuggestedValue: any =
                fieldMeta.suggest ??
                rawSchemaField?.suggest ??
                null;

            const metaCommentSuggestedValue: any = this.extractSuggestFromComment(
                metaComment,
            );
            const schemaCommentSuggestedValue: any = this.extractSuggestFromComment(
                schemaComment,
            );

            const commentSuggestedValue: any =
                schemaCommentSuggestedValue ?? metaCommentSuggestedValue ?? null;

            const finalSuggestedValue: any =
                directSuggestedValue ??
                commentSuggestedValue ??
                this.schemaDefault;

            this.schemaSuggested = finalSuggestedValue;

            const schemaFieldType: string = String(
                fieldMeta.type ||
                rawSchemaField?.type ||
                '',
            ).toLowerCase();

            const customType: string = String(
                fieldMeta.customType ||
                rawSchemaField?.customType ||
                '',
            ).toLowerCase();

            const hasAnyValue: boolean = this.fieldValue !== null;

            if (hasAnyValue) {
                if (
                    schemaFieldType === 'object' ||
                    schemaFieldType === 'array' ||
                    customType === 'table'
                ) {
                    this.valueKind = 'data-structure';
                } else {
                    this.valueKind = 'scalar';
                }
            } else {
                this.valueKind = null;
            }

            this.valueStatus = this.calcValueStatus(
                this.fieldValue,
                this.schemaDefault,
                this.schemaSuggested,
                schemaFieldType,
            );
        }

        const parentsRaw: any = payload?._parentItems;

        if (Array.isArray(parentsRaw)) {
            const documentsSet: Set<string> = new Set<string>();

            for (const parentItem of parentsRaw) {
                const documentName: string | undefined =
                    parentItem?.linkEntityName ||
                    parentItem?.entity ||
                    parentItem?._linkEntity?.name ||
                    parentItem?.name ||
                    parentItem?.id ||
                    parentItem?.uuid;

                if (documentName) {
                    documentsSet.add(documentName);
                }
            }

            this.parentDocuments = Array.from(documentsSet);
        } else {
            this.parentDocuments = [];
        }
    }

    public clearSelection(): void {
        this.selectedNode = null;
        this.selectedItem = null;
        this.selectedTitle = '';

        this.nodeDocument = null;
        this.parentDocuments = [];
        this.fieldName = null;
        this.fieldPath = null;

        this.mainValue = null;
        this.mainValueLabel = null;
        this.fieldValue = null;

        this.schemaDefault = null;
        this.schemaSuggested = null;
        this.valueStatus = null;
        this.valueKind = null;

        if (this.treeGraph) {
            this.treeGraph.onSelectNode(null);
        }
    }

    private getNodeValueStatusFromPayload(
        payload: any,
    ): ValueStatus | null {
        if (!payload) {
            return null;
        }

        const linkItem: any = payload._linkItem || payload.linkItem;

        if (!linkItem) {
            return null;
        }

        let fieldValue: any =
            linkItem.value ??
            linkItem._value ??
            linkItem.example ??
            null;

        if (this.isEmptyValue(fieldValue)) {
            fieldValue = null;
        }

        const fieldMeta: any = linkItem._field || linkItem.field || {};
        const rawSchemaField: any = this.resolveSchemaFieldFromLink(linkItem);

        const metaComment: any =
            fieldMeta.$comment !== undefined
                ? fieldMeta.$comment
                : fieldMeta.comment;

        const schemaComment: any =
            rawSchemaField && (rawSchemaField.$comment || rawSchemaField.comment);

        let schemaDefault: any = null;

        if (fieldMeta.default !== undefined) {
            schemaDefault = fieldMeta.default;
        } else if (rawSchemaField && rawSchemaField.default !== undefined) {
            schemaDefault = rawSchemaField.default;
        }

        const directSuggestedValue: any =
            fieldMeta.suggest ??
            rawSchemaField?.suggest ??
            null;

        const metaCommentSuggestedValue: any = this.extractSuggestFromComment(
            metaComment,
        );
        const schemaCommentSuggestedValue: any = this.extractSuggestFromComment(
            schemaComment,
        );

        const commentSuggestedValue: any =
            schemaCommentSuggestedValue ?? metaCommentSuggestedValue ?? null;

        const finalSuggestedValue: any =
            directSuggestedValue ??
            commentSuggestedValue ??
            schemaDefault;

        const schemaFieldType: string = String(
            fieldMeta.type ||
            rawSchemaField?.type ||
            '',
        ).toLowerCase();

        const valueStatus: ValueStatus = this.calcValueStatus(
            fieldValue,
            schemaDefault,
            finalSuggestedValue,
            schemaFieldType,
        );

        return valueStatus;
    }

    private resolveSchemaFieldFromLink(linkItem: any): any {
        if (!linkItem) {
            return null;
        }

        const schemaDocument: any = linkItem._schema?.document;

        const schemaPath: string | undefined =
            linkItem._path ||
            linkItem.path ||
            linkItem.schemaPath;

        if (!schemaDocument || !schemaPath) {
            return null;
        }

        const pathSegments: string[] = schemaPath.split('.');
        let currentNode: any = schemaDocument;

        for (const segment of pathSegments) {
            const properties: any = currentNode?.properties;

            if (!properties || !properties[segment]) {
                return null;
            }

            currentNode = properties[segment];
        }

        return currentNode;
    }

    private extractSuggestFromComment(rawComment: any): any {
        if (!rawComment) {
            return null;
        }

        if (typeof rawComment === 'string') {
            try {
                const parsedComment: any = JSON.parse(rawComment);
                return parsedComment?.suggest ?? null;
            } catch {
                return null;
            }
        }

        if (typeof rawComment === 'object') {
            return (rawComment as any).suggest ?? null;
        }

        return null;
    }

    private isEmptyValue(value: any): boolean {
        if (value === null || value === undefined) {
            return true;
        }

        if (typeof value === 'string') {
            return value.trim().length === 0;
        }

        if (Array.isArray(value)) {
            return value.length === 0;
        }

        if (typeof value === 'object') {
            return Object.keys(value).length === 0;
        }

        return false;
    }

    private valuesEqual(first: any, second: any): boolean {
        return JSON.stringify(first) === JSON.stringify(second);
    }

    private normalizeValueForFieldType(
        rawValue: any,
        fieldType: string | null,
    ): any {
        if (rawValue === null || rawValue === undefined) {
            return null;
        }

        const normalizedType: string = String(fieldType || '').toLowerCase();

        if (normalizedType === 'number' || normalizedType === 'integer') {
            if (typeof rawValue === 'string' && rawValue.trim().length === 0) {
                return null;
            }

            const numericValue: number = Number(rawValue);

            if (Number.isNaN(numericValue)) {
                return rawValue;
            }

            return numericValue;
        }

        if (normalizedType === 'boolean') {
            if (rawValue === true || rawValue === false) {
                return rawValue;
            }

            if (typeof rawValue === 'string') {
                const lowerCaseValue: string = rawValue.trim().toLowerCase();

                if (lowerCaseValue === 'true') {
                    return true;
                }

                if (lowerCaseValue === 'false') {
                    return false;
                }
            }
        }

        return rawValue;
    }

    private calcValueStatus(
        value: any,
        schemaDefault: any,
        schemaSuggested: any,
        fieldType: string | null,
    ): ValueStatus {
        const normalizedValue: any = this.normalizeValueForFieldType(
            value,
            fieldType,
        );
        const normalizedDefault: any = this.normalizeValueForFieldType(
            schemaDefault,
            fieldType,
        );
        const normalizedSuggested: any = this.normalizeValueForFieldType(
            schemaSuggested,
            fieldType,
        );

        if (this.isEmptyValue(normalizedValue)) {
            return 'missing';
        }

        const hasDefault: boolean =
            normalizedDefault !== null && normalizedDefault !== undefined;
        const hasSuggested: boolean =
            normalizedSuggested !== null && normalizedSuggested !== undefined;

        if (hasDefault && this.valuesEqual(normalizedValue, normalizedDefault)) {
            return 'default';
        }

        if (
            hasSuggested &&
            this.valuesEqual(normalizedValue, normalizedSuggested)
        ) {
            return 'asSuggested';
        }

        return 'notNull';
    }

    public getItemType(item: FormulaItem | SchemaItem | any): string {
        if (!item) {
            return '';
        }

        return item.type || '';
    }

    public getItemDescription(item: FormulaItem | SchemaItem | any): string {
        if (!item) {
            return '';
        }

        return item.description || '';
    }

    public getItemMainValue(item: FormulaItem | SchemaItem | any): string {
        if (!item) {
            return '';
        }

        const itemType: string = String(item.type || '').toLowerCase();

        if (itemType === 'formula') {
            return item.value || item._value || '';
        }

        if (itemType === 'constant') {
            return item.value || item._value || '';
        }

        if (itemType === 'text') {
            return item.value || item._value || '';
        }

        return item.value || item._value || '';
    }

    public getItemMainValueLabel(
        item: FormulaItem | SchemaItem | any,
    ): string {
        if (!item) {
            return '';
        }

        const itemType: string = String(item.type || '').toLowerCase();

        if (itemType === 'formula') {
            return 'Formula';
        }

        if (itemType === 'constant') {
            return 'Value';
        }

        if (itemType === 'text') {
            return 'Text';
        }

        if (itemType === 'variable') {
            return 'Value from VC';
        }

        return 'Value';
    }

    public formatValueStatus(status: ValueStatus | null): string {
        if (!status) {
            return '';
        }

        switch (status) {
            case 'missing':
                return 'Missing (no value)';

            case 'default':
                return 'Default value';

            case 'asSuggested':
                return 'Suggested value';

            case 'notNull':
                return 'Custom value (not null)';

            default:
                return '';
        }
    }

    public formatValueKind(kind: ValueKind | null): string {
        if (!kind) {
            return '';
        }

        if (kind === 'scalar') {
            return 'Scalar value';
        }

        return 'Data structure';
    }

    public getNodeStatusCssClass(node: TreeNode<GraphNodeData> | any): string {
        if (!node || !node.data) {
            return 'status-none';
        }

        const payload: any = node.data.payload || {};
        const itemType: string = String(payload.type || '').toLowerCase();

        if (itemType !== 'variable' && itemType !== 'text') {
            return 'status-none';
        }

        const valueStatus: ValueStatus | null = node.data.valueStatus || null;

        if (!valueStatus) {
            return 'status-none';
        }

        return 'status-' + valueStatus;
    }

    public getNodeStatusClass(rawNode: any): string {
        const node: GraphNode | null = rawNode as GraphNode;

        if (!node || !node.data || !node.data.payload) {
            return 'status-none';
        }

        const payload: any = node.data.payload;
        const itemType: string = String(payload.type || '').toLowerCase();

        if (itemType !== 'variable' && itemType !== 'text') {
            return 'status-none';
        }

        const linkItem: any = payload._linkItem || payload.linkItem;

        if (!linkItem) {
            return 'status-missing';
        }

        let fieldValue: any =
            linkItem.value ??
            linkItem._value ??
            linkItem.example ??
            null;

        if (this.isEmptyValue(fieldValue)) {
            fieldValue = null;
        }

        const fieldMeta: any = linkItem._field || linkItem.field || {};
        const rawSchemaField: any = this.resolveSchemaFieldFromLink(linkItem);

        const metaComment: any =
            fieldMeta.$comment !== undefined
                ? fieldMeta.$comment
                : fieldMeta.comment;

        const schemaComment: any =
            rawSchemaField && (rawSchemaField.$comment || rawSchemaField.comment);

        let schemaDefault: any = null;

        if (fieldMeta.default !== undefined) {
            schemaDefault = fieldMeta.default;
        } else if (rawSchemaField && rawSchemaField.default !== undefined) {
            schemaDefault = rawSchemaField.default;
        }

        const directSuggestedValue: any =
            fieldMeta.suggest ??
            rawSchemaField?.suggest ??
            null;

        const metaCommentSuggestedValue: any = this.extractSuggestFromComment(
            metaComment,
        );
        const schemaCommentSuggestedValue: any = this.extractSuggestFromComment(
            schemaComment,
        );

        const commentSuggestedValue: any =
            schemaCommentSuggestedValue ?? metaCommentSuggestedValue ?? null;

        const finalSuggestedValue: any =
            directSuggestedValue ??
            commentSuggestedValue ??
            schemaDefault;

        const schemaFieldType: string = String(
            fieldMeta.type ||
            rawSchemaField?.type ||
            '',
        ).toLowerCase();

        const valueStatus: ValueStatus = this.calcValueStatus(
            fieldValue,
            schemaDefault,
            finalSuggestedValue,
            schemaFieldType,
        );

        switch (valueStatus) {
            case 'missing':
                return 'status-missing';
            case 'default':
                return 'status-default';
            case 'asSuggested':
                return 'status-asSuggested';
            case 'notNull':
                return 'status-notNull';
            default:
                return 'status-none';
        }
    }
}
