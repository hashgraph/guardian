import {
    Component,
    Input,
    OnChanges,
} from '@angular/core';
import {
    FormulasTree,
    FormulaItem,
    SchemaItem,
} from '../../../models/formula-tree';
import {TreeGraphComponent} from 'src/app/modules/common/tree-graph/tree-graph.component';
import {TreeNode} from 'src/app/modules/common/tree-graph/tree-node';
import {TreeSource} from 'src/app/modules/common/tree-graph/tree-source';

type ValueStatus = 'Missing' | 'Default' | 'Suggested' | 'Not null';

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
export class FormulasGraphTabComponent implements OnChanges {
    @Input()
    public tree!: FormulasTree;
    @Input()
    public schema!: string;
    @Input()
    public path!: string;

    public source: TreeSource<GraphNode> | null = null;
    private treeGraph: TreeGraphComponent | null = null;
    public selectedNode: GraphNode | null = null;
    public title: string | null = null
    public nodeDocument: string | null = null;
    public parentDocuments: string[] = [];
    public fieldDescription: string | null = null;
    public fieldPath: string | null = null;
    public fieldValue: any = null;
    public itemType: string | null = null;
    public itemValue: any = null;
    public valueStatus: ValueStatus | null = null;
    public fieldType: string | null = null;
    public showTechnicalDetails = false;
    public isJsonExpanded = false;
    public nodeDescription: string | null = null;

    public ngOnChanges(): void {
        this.source = this.buildGraph(this.tree, this.schema, this.path);

        if (this.treeGraph && this.source) {
            this.treeGraph.setData(this.source);
            this.treeGraph.move(18, 46);
        }
    }

    private buildTitle(node: any): string {
        const {type, name} = node;

        if (type && name) {
            return `${type}: ${name}`;
        }

        return name || type;
    }

    private buildGraph(tree: FormulasTree, schema: string, path: string): TreeSource<GraphNode> | null {
        const items = tree.get(schema, path);
        if (!items?.length) {
            return null;
        }

        const navigationTree = FormulasTree.createNav(items);
        const graphNodes: GraphNode[] = [];

        const walk = (node: Record<string, any>, parent: GraphNode | null): void => {
            const isComponent = String(node.view || '').toLowerCase() === 'component';
            let currentParent = parent;

            if (isComponent) {
                const id = node.id;
                const type = parent ? 'sub' : 'root';
                const data: GraphNodeData = {
                    title: this.buildTitle(node),
                    payload: node.data,
                    valueStatus: null,
                };

                const gNode = new TreeNode<GraphNodeData>(id, type, data);
                graphNodes.push(gNode);
                parent?.addId(gNode.id);
                currentParent = gNode;
            }

            for (const child of node.children ?? []) {
                walk(child, currentParent);
            }
        };

        walk(navigationTree, null);

        return graphNodes.length ? new TreeSource<GraphNode>(graphNodes) : null;
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

    private parseJSON(value: any): any {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);

                if (Array.isArray(parsed)) {
                    return 'array';
                }
                return typeof parsed;
            } catch {
                return typeof value;
            }
        }

        return typeof value;
    }

    private buildSchemaNamesChain(schema: any, path: string): string[] {
        const names: string[] = [];
        let node = schema;
        const parts = path.split('.');

        for (const key of parts) {
            if (!node) {
                break;
            }

            if (Array.isArray(node.fields)) {
                names.push(node.description || node.name);

                node = node.fields.find((f: any) => f.name === key);
            } else {
                break;
            }
        }

        return names;
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

    private calcValueStatus(
        value: any,
        schemaDefault: any,
        schemaSuggested: any
    ): ValueStatus {
        if (this.isEmptyValue(value)) {
            return 'Missing';
        }

        if (this.valuesEqual(value, schemaDefault)) {
            return 'Default';
        }

        if (this.valuesEqual(value, schemaSuggested)) {
            return 'Suggested';
        }

        return 'Not null';
    }

    public clearSelection(): void {
        this.selectedNode = null;
        this.title = null;
        this.nodeDocument = null;
        this.parentDocuments = [];
        this.fieldDescription = null;
        this.fieldPath = null;
        this.fieldValue = null;
        this.itemType = null;
        this.itemValue = null;
        this.valueStatus = null;
        this.fieldType = null;
        this.showTechnicalDetails = false;
        this.isJsonExpanded = false;
        this.nodeDescription = null
    }

    public onSelect(node: TreeNode<GraphNodeData> | null): void {
        if (!node) {
            this.clearSelection();
            return;
        }

        this.clearSelection();

        this.selectedNode = node;
        this.title = node.data.title;

        const payload = node.data.payload;
        const linkItem = payload._linkItem;

        this.itemType = payload.type ?? null;
        this.itemValue = payload.value ?? (payload as any)._value ?? null;
        this.nodeDescription = payload.description ?? null;

        if (linkItem) {
            this.fieldValue = linkItem.value;
            this.fieldPath = linkItem._path;
            this.fieldDescription = linkItem._field.description ?? null;

            const schemaDefault = linkItem._field.default;
            const schemaSuggested = linkItem._field.suggest;

            this.valueStatus = this.calcValueStatus(
                linkItem.value,
                schemaDefault,
                schemaSuggested,
            );

            this.fieldType = this.parseJSON(linkItem.value);

            const schemaNamesChain = this.buildSchemaNamesChain(linkItem._schema, linkItem._path);
            this.nodeDocument = schemaNamesChain.at(-1) ?? null;
            schemaNamesChain.pop();
            this.parentDocuments = schemaNamesChain;
        } else {
            this.fieldValue = null;
            this.fieldPath = null;
            this.fieldDescription = null;
            this.fieldType = null;
            this.valueStatus = null;
            this.nodeDocument = null;
            this.parentDocuments = [];
            this.showTechnicalDetails = false;
        }
    }

    public getNodeStatusClass(rawNode: GraphNode): string {
        const payload = rawNode.data.payload;
        const itemType = payload.type;

        if (itemType === 'constant') {
            return 'status-none';
        }

        const linkItem = payload._linkItem;
        if (!linkItem) {
            return 'status-none';
        }

        const value = linkItem.value;
        const def = linkItem._field?.default;
        const suggest = linkItem._field?.suggest;

        const status = this.calcValueStatus(value, def, suggest);

        switch (status) {
            case 'Missing':
                return 'status-missing';
            case 'Default':
                return 'status-default';
            case 'Suggested':
                return 'status-as-suggested';
            case 'Not null':
                return 'status-notNull';
            default:
                return 'status-none';
        }
    }

    public toggleTechnicalDetails(): void {
        this.showTechnicalDetails = !this.showTechnicalDetails;
    }

    public formatValueForJson(value: any): any {
        if (typeof value !== 'string') {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    public toggleJsonExpanded(): void {
        this.isJsonExpanded = !this.isJsonExpanded;
    }
}
