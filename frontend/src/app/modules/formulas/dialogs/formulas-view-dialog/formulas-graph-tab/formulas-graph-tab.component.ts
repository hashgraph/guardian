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
            console.log('[GraphTab] no inputs', {
                tree: !!this.tree,
                schema: this.schema,
                path: this.path,
            });
            return;
        }

        const items: FormulaItem[] = this.tree.get(this.schema, this.path) || [];
        console.log('[GraphTab] items.length', items.length);

        if (!items || !items.length) {
            return;
        }

        const navTree = FormulasTree.createNav(items);
        console.log('[GraphTab] navTree', navTree);

        const nodes: GraphNode[] = [];

        const walk = (navNode: any, parent: GraphNode | null) => {
            if (!navNode) {
                return;
            }

            console.log('[GraphTab] walk navNode', {
                view: navNode.view,
                type: navNode.type,
                name: navNode.name,
                hasChildren: !!(navNode.children && navNode.children.length),
            });

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

                console.log('[GraphTab] create GraphNode', {
                    id,
                    type: nodeType,
                    title: data.title,
                    parentId: parent?.id,
                });

                if (parent) {
                    parent.addId(graphNode.id);
                }

                currentParent = graphNode;
            }

            // Always traverse children, even if current node is not a graph node
            if (Array.isArray(navNode.children)) {
                for (const child of navNode.children) {
                    walk(child, currentParent);
                }
            }
        };

        // Start from children of the virtual root
        if (Array.isArray(navTree.children) && navTree.children.length) {
            for (const child of navTree.children) {
                walk(child, null);
            }
        } else {
            walk(navTree, null);
        }

        console.log('[GraphTab] total graph nodes', nodes.length);

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

    /**
     * Builds human-readable node title for the graph.
     * We do not show the "component" word, only type and name.
     */
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
        // Reserved for future custom actions on render
    }

    public onSelect(node: TreeNode<GraphNodeData> | null): void {
        if (!node) {
            this.clearSelection();
            return;
        }

        this.selectedNode = node as GraphNode;
        this.selectedItem = node.data.payload;
        this.selectedTitle = node.data.title;

        const payload: any = node.data.payload || {};

        this.nodeDocument =
            payload?.linkEntityName ||
            payload?.entity ||
            payload?._linkEntity?.name ||
            null;

        const parentsRaw: any = payload?._parentItems;
        if (Array.isArray(parentsRaw)) {
            this.parentDocuments = parentsRaw
                .map((p: any) => p?.name || p?.id || p?.uuid)
                .filter((x: any) => !!x);
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
}
