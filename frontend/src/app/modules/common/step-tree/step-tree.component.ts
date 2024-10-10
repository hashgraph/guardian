import { NestedTreeControl } from '@angular/cdk/tree';
import {
    Component,
    EventEmitter,
    Input,
    Output,
    SimpleChanges,
} from '@angular/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';

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
    dataSource = new MatTreeNestedDataSource<TreeNode>();

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
}
