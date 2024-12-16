import { NestedTreeControl } from '@angular/cdk/tree';
import {
    Component,
    EventEmitter,
    Input,
    Output,
    SimpleChanges,
} from '@angular/core';
// import { MatTreeNestedDataSource } from '@angular/material/tree';

interface TreeNode {
    name: string;
    children?: TreeNode[];
}

@Component({
    selector: 'app-step-tree',
    templateUrl: './step-tree.component.html',
    styleUrls: ['./step-tree.component.scss'],
})
export class StepTreeComponent {
    treeControl = new NestedTreeControl<TreeNode>((node) => node.children);
    // dataSource = new MatTreeNestedDataSource<TreeNode>();
    dataSource: { data: TreeNode[] } = { data: [] }
    expandedKeys: { [key: string]: boolean } = {};

    @Input('treeData') treeData!: any;
    @Input('currentNode') currentNode!: any;

    @Output('currentNodeChange') currentNodeChange: EventEmitter<any> =
        new EventEmitter<any>();

    constructor() {}

    ngOnInit() {
        this.dataSource.data = this.treeData;
        this.treeControl.dataNodes = this.treeData;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.currentNode.isFirstChange()) {
            this.expandAllParents(changes.currentNode.currentValue);
        } else if (changes.currentNode.currentValue?.parent) {
            this.treeControl.expand(changes.currentNode.currentValue.parent);
        }
    }

    expandAllParents(node: any) {
        if (node.parent) {
            this.treeControl.expand(node.parent);
            this.expandAllParents(node.parent);
        }
    }

    hasChild(_: number, node: TreeNode) {
        return !!node.children && node.children.length > 0;
    }

    onNodeClick(node: any) {
        this.currentNodeChange.emit(node);
    }

    refreshTree() {
        const data = this.dataSource.data;
        this.dataSource.data = [];
        this.dataSource.data = data;
        this.treeControl.dataNodes = data;
        this.treeControl.expand(this.currentNode);
    }

    addKeysToNodes(nodes: TreeNode[], parentKey: string = ''): TreeNode[] {
        return nodes.map((node, index) => {
            const key = `${parentKey}${index}`;
            return {
                ...node,
                key,
                children: node.children
                    ? this.addKeysToNodes(node.children, `${key}-`)
                    : [],
            };
        });
    }

    expandParents(node: TreeNode) {
        let current: any = node;
        while (current) {
            this.expandedKeys[current.key] = true;
            current = this.findParentNode(this.treeData, current);
        }
    }

    findParentNode(nodes: TreeNode[], target: TreeNode): TreeNode | null {
        for (const node of nodes) {
            if (node.children?.includes(target)) {
                return node;
            } else if (node.children) {
                const parent = this.findParentNode(node.children, target);
                if (parent) return parent;
            }
        }
        return null;
    }

    setExpandedNodes(nodes: any[]) {
        nodes.forEach((node) => {
            node.expanded = true;
            if (node.children) {
                this.setExpandedNodes(node.children);
            }
        });
    }
}
