import {
    Component,
    Input,
    OnInit,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { FormulasTree, FormulaItem } from '../../../models/formula-tree';
import { TreeGraphComponent } from 'src/app/modules/common/tree-graph/tree-graph.component';
import { TreeNode } from 'src/app/modules/common/tree-graph/tree-node';
import { TreeSource } from 'src/app/modules/common/tree-graph/tree-source';

interface FormulaNodeData {
    id: string;
    title: string;
}

class FormulaNode extends TreeNode<FormulaNodeData> {
    constructor(id: string, type: 'root' | 'sub' | null, data: FormulaNodeData) {
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
    public source: TreeSource<FormulaNode> | null = null;

    private treeGraph: TreeGraphComponent | null = null;

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

        const nodes: FormulaNode[] = [];

        items.forEach((item: FormulaItem, index: number) => {
            const id = `n-${index}`;
            const data: FormulaNodeData = {
                id,
                title: this.getTitle(item as any),
            };
            nodes.push(new FormulaNode(id, 'root', data));
        });

        if (!nodes.length) {
            return;
        }

        this.source = new TreeSource<FormulaNode>(nodes);
        this.hasData = true;

        if (this.treeGraph && this.source) {
            this.treeGraph.setData(this.source);
            this.treeGraph.move(18, 46);
        }
    }

    private getTitle(item: any): string {
        const type = item?.type || '';
        const name = item?.name || '';

        switch (type) {
            case 'formula':
                return name ? `Formula: ${name}` : 'Formula';
            case 'variable':
                return name ? `Variable: ${name}` : 'Variable';
            case 'constant':
                return name ? `Constant: ${name}` : 'Constant';
            case 'text':
                return name ? `Text: ${name}` : 'Text';
            case 'schema':
                return name ? `Schema: ${name}` : 'Schema field';
            default:
                if (name && type) {
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
    }

    public initGraph(tree: TreeGraphComponent): void {
        this.treeGraph = tree;
        if (this.source) {
            this.treeGraph.setData(this.source);
            this.treeGraph.move(18, 46);
        }
    }

    public onRender(): void {}

    public onSelect(node: TreeNode<FormulaNodeData> | null): void {}
}
