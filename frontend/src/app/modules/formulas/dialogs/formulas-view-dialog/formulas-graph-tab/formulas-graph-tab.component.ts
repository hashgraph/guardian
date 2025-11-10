import {
    Component,
    Input,
    OnInit,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { FormulasTree, FormulaItem, SchemaItem } from '../../../models/formula-tree';
import { TreeGraphComponent } from 'src/app/modules/common/tree-graph/tree-graph.component';
import { TreeNode } from 'src/app/modules/common/tree-graph/tree-node';
import { TreeSource } from 'src/app/modules/common/tree-graph/tree-source';

interface GraphNodeData {
    title: string;
    payload: FormulaItem | any;
}

class GraphNode extends TreeNode<GraphNodeData> {
    constructor(id: string, type: 'root' | 'sub', data: GraphNodeData) {
        super(id, type, data);
    }
}

@Component({
    selector: 'formulas-graph-tab',
    templateUrl: './formulas-graph-tab.component.html',
    styleUrls: ['./formulas-graph-tab.component.scss'],
})
export class FormulasGraphTabComponent implements OnInit, OnChanges {
    @Input() tree!: FormulasTree;
    @Input() schema!: string;
    @Input() path!: string;

    public hasData = false;
    public source: TreeSource<GraphNode> | null = null;

    private treeGraph: TreeGraphComponent | null = null;

    public selectedNode: GraphNode | null = null;
    public selectedItem: FormulaItem | SchemaItem | null = null;
    public selectedTitle: string = '';

    public nodeDocument: string | null = null;
    public parentDocuments: string[] = [];
    public fieldName: string | null = null;

    public mainValue: string | null = null;
    public mainValueLabel: string | null = null;
    public fieldValue: any = null;

    ngOnInit(): void {
        this.buildGraph();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('tree' in changes || 'schema' in changes || 'path' in changes) {
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

        const navTree = FormulasTree.createNav(items);
        const nodes: GraphNode[] = [];

        const walk = (navNode: any, parent: GraphNode | null) => {
            if (!navNode) {
                return;
            }

            const isComponent =
                String(navNode.view || '').toLowerCase() === 'component';

            let currentParent = parent;

            if (isComponent) {
                const id: string = navNode.id || `n-${nodes.length}`;
                const nodeType: 'root' | 'sub' = parent ? 'sub' : 'root';

                const data: GraphNodeData = {
                    title: this.buildTitle(navNode),
                    payload: navNode.data,
                };

                const graphNode = new GraphNode(id, nodeType, data);
                nodes.push(graphNode);

                if (parent) {
                    parent.addId(graphNode.id);
                }

                currentParent = graphNode;
            }

            if (Array.isArray(navNode.children)) {
                for (const child of navNode.children) {
                    walk(child, currentParent);
                }
            }
        };

        if (Array.isArray(navTree.children) && navTree.children.length) {
            for (const child of navTree.children) {
                walk(child, null);
            }
        } else {
            walk(navTree, null);
        }

        if (!nodes.length) {
            return;
        }

        this.source = new TreeSource<GraphNode>(nodes);
        this.hasData = true;

        if (this.treeGraph && this.source) {
            this.treeGraph.setData(this.source);
            this.treeGraph.move(18, 46);
        }
    }

    private buildTitle(navNode: any): string {
        const type: string = navNode.type || '';
        const name: string = navNode.name || '';

        if (type && name) {
            return `${type}: ${name}`;
        }
        if (name) {
            return name;
        }
        if (type) {
            return type;
        }
        return 'Item';
    }

    public initGraph(tree: TreeGraphComponent): void {
        this.treeGraph = tree;
        if (this.source) {
            this.treeGraph.setData(this.source);
        }
    }

    public onRender(): void {
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

        // basic info
        this.mainValue = this.getItemMainValue(payload) || null;
        this.mainValueLabel = this.getItemMainValueLabel(payload) || null;

        // VC document where this node is linked
        this.nodeDocument =
            payload?.linkEntityName ||
            payload?.entity ||
            payload?._linkEntity?.name ||
            null;

        // field name inside VC
        this.fieldName =
            payload?.linkItemName ||
            payload?._linkItem?.name ||
            null;

        this.fieldValue = null;
        const linkItem: any = payload._linkItem || payload.linkItem;
        if (linkItem) {
            this.fieldValue =
                linkItem.value ??
                linkItem._value ??
                linkItem.example ??
                null;
        }

        // parent VC documents / parent items
        const parentsRaw: any = payload?._parentItems;
        if (Array.isArray(parentsRaw)) {
            const docs = new Set<string>();
            for (const p of parentsRaw) {
                const docName =
                    p?.linkEntityName ||
                    p?.entity ||
                    p?._linkEntity?.name ||
                    p?.name ||
                    p?.id ||
                    p?.uuid;
                if (docName) {
                    docs.add(docName);
                }
            }
            this.parentDocuments = Array.from(docs);
        } else {
            this.parentDocuments = [];
        }

        console.log('[GraphTab] select payload debug', {
            type: payload.type,
            name: payload.name,
            value: payload.value,
            mainValue: this.mainValue,
            fieldName: this.fieldName,
            fieldValue: this.fieldValue,
            nodeDocument: this.nodeDocument,
            parents: this.parentDocuments
        });
    }

    public clearSelection(): void {
        this.selectedNode = null;
        this.selectedItem = null;
        this.selectedTitle = '';
        this.nodeDocument = null;
        this.parentDocuments = [];
        this.fieldName = null;
        this.mainValue = null;
        this.mainValueLabel = null;
        this.fieldValue = null;

        if (this.treeGraph) {
            this.treeGraph.onSelectNode(null);
        }
    }

    public getItemType(item: FormulaItem | SchemaItem | any): string {
        return item?.type || '';
    }

    public getItemDescription(item: FormulaItem | SchemaItem | any): string {
        return item?.description || '';
    }

    public getItemMainValue(item: FormulaItem | SchemaItem | any): string {
        if (!item) {
            return '';
        }

        const type = String(item.type || '').toLowerCase();

        if (type === 'formula') {
            return item.value || item._value || '';
        }

        if (type === 'constant') {
            return item.value || item._value || '';
        }

        if (type === 'text') {
            return item.value || item._value || '';
        }

        return item.value || item._value || '';
    }

    public getItemMainValueLabel(item: FormulaItem | SchemaItem | any): string {
        if (!item) {
            return '';
        }

        const type = String(item.type || '').toLowerCase();

        if (type === 'formula') {
            return 'Formula';
        }

        if (type === 'constant') {
            return 'Value';
        }

        if (type === 'text') {
            return 'Text';
        }

        if (type === 'variable') {
            return 'Value from VC';
        }

        return 'Value';
    }
}
