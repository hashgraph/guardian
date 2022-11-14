import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, ElementRef, EventEmitter, Injectable, Input, Output, SimpleChanges } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { BehaviorSubject, Observable, of as observableOf } from 'rxjs';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { SelectionModel } from '@angular/cdk/collections';
import { BlockNode } from 'src/app/policy-engine/helpers/tree-data-source/tree-data-source';
import { RegisteredBlocks } from '../../registered-blocks';

/** Flat node with expandable and level information */
export class FlatBlockNode {
    public about!: any;
    public prev!: any;
    public next!: any;
    public root!: any;
    public icon!: any;

    constructor(
        public expandable: boolean,
        public level: number,
        public node: BlockNode
    ) {
    }
}

/**
 * @title Tree with flat nodes
 */
@Component({
    selector: 'tree-flat-overview',
    templateUrl: 'tree-flat-overview.html',
    styleUrls: ['tree-flat-overview.css']
})
export class TreeFlatOverview {
    @Input('blocks') blocks!: BlockNode[];
    @Input('errors') errors!: any;

    @Output('delete') delete = new EventEmitter();
    @Output('select') select = new EventEmitter();
    @Output('reorder') reorder = new EventEmitter();
    @Output('change') change = new EventEmitter();
    @Output('init') init = new EventEmitter();

    currentBlock: any;
    root!: BlockNode;

    treeControl: FlatTreeControl<FlatBlockNode>;
    treeFlattener: MatTreeFlattener<BlockNode, FlatBlockNode>;
    dataSource: MatTreeFlatDataSource<BlockNode, FlatBlockNode>;
    // expansion model tracks expansion state
    expansionModel = new SelectionModel<string>(true);
    dragging = false;
    expandTimeout: any;
    expandDelay = 1000;
    validateDrop = false;
    isCollapseAll = true;
    eventsDisabled = false;
    visibleMoveActions = false;

    public readonly context: ElementRef;

    constructor(
        private element: ElementRef,
        private registeredBlocks: RegisteredBlocks
    ) {
        this.context = element;
        this.treeFlattener = new MatTreeFlattener(this.transformer, this._getLevel,
            this._isExpandable, this._getChildren);
        this.treeControl = new FlatTreeControl<FlatBlockNode>(this._getLevel, this._isExpandable);
        this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
        this.treeControl.expansionModel.changed.subscribe(e => {
            this.isCollapseAll = !e.source.selected.length;
            if (!this.eventsDisabled) {
                this.change.emit();
            }
        })
    }

    ngAfterViewInit(): void {
        this.init.emit(this);
    }

    ngOnDestroy(): void {
        this.init.emit(null);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.rebuildTreeForData(this.blocks);
        if (changes.errors && this.errors) {
            this.setErrors(this.errors);
        }
    }

    transformer = (node: BlockNode, level: number) => {
        const e = new FlatBlockNode(!!(node.children && node.children.length), level, node);
        e.root = e.node == this.root;
        e.icon = this.registeredBlocks.getIcon(e.node.blockType);
        e.about = this.registeredBlocks.bindAbout(e.node.blockType, e.node);
        return e;
    }
    private _getLevel = (node: FlatBlockNode) => node.level;
    private _isExpandable = (node: FlatBlockNode) => node.expandable;
    private _getChildren = (node: BlockNode): Observable<BlockNode[]> => observableOf(node.children);
    hasChild = (_: number, _nodeData: FlatBlockNode) => _nodeData.expandable;

    /**
     * This constructs an array of nodes that matches the DOM
     */
    visibleNodes(): BlockNode[] {
        const result: any = [];

        function addExpandedChildren(node: BlockNode, expanded: FlatBlockNode[]) {
            result.push(node);
            if (expanded.find((e) => { return e && e.node.id == node.id })) {
                node.children.map((child) => addExpandedChildren(child, expanded));
            }
        }
        this.dataSource.data.forEach((node) => {
            addExpandedChildren(node, this.treeControl.expansionModel.selected);
        });
        return result;
    }

    compare(a: BlockNode, b: BlockNode): boolean {
        return a.id == b.id;
    }

    onMoveBlockUpDown(position: number) {
        const currentBlockParent = this.currentBlock?.parent;
        if (currentBlockParent && currentBlockParent.children) {
            const currentBlockIndex = currentBlockParent.children.indexOf(this.currentBlock);
            moveItemInArray(currentBlockParent.children, currentBlockIndex, currentBlockIndex + position);
            this.reorder.emit(this.dataSource.data);
        }
    }

    onMoveBlockLeft() {
        const currentBlockParent = this.currentBlock?.parent;
        if (currentBlockParent &&
            currentBlockParent.children &&
            currentBlockParent.parent &&
            currentBlockParent.parent.children
        ) {
            const currentBlockIndex = currentBlockParent.children.indexOf(this.currentBlock);
            const currentBlockParentIndex = currentBlockParent.parent.children.indexOf(currentBlockParent);
            this.currentBlock.parent = currentBlockParent.parent;
            transferArrayItem(
                currentBlockParent.children,
                currentBlockParent.parent.children,
                currentBlockIndex,
                currentBlockParentIndex
            );
            this.reorder.emit(this.dataSource.data);
        }
    }

    onMoveBlockRight() {
        const currentBlockParent = this.currentBlock?.parent;
        if (currentBlockParent && currentBlockParent.children) {
            const currentBlockIndex = currentBlockParent.children.indexOf(this.currentBlock);
            const nextBlock = currentBlockParent.children[currentBlockIndex + 1];
            if (nextBlock && nextBlock.children) {
                transferArrayItem(currentBlockParent.children, nextBlock.children, currentBlockIndex, 0);
                this.expansionModel.select(nextBlock.id);
                this.reorder.emit(this.dataSource.data);
            }
        }
    }

    /**
     * Handle the drop - here we rearrange the data based on the drop event,
     * then rebuild the tree.
     * */
    drop(event: CdkDragDrop<string[]>) {
        // ignore drops outside of the tree
        if (
            !event.isPointerOverContainer ||
            event.previousIndex === event.currentIndex
        ) {
            return;
        }

        // construct a list of visible nodes, this will match the DOM.
        // the cdkDragDrop event.currentIndex jives with visible nodes.
        // it calls rememberExpandedTreeNodes to persist expand state
        const visibleNodes = this.visibleNodes();

        // deep clone the data source so we can mutate it
        const changedData: BlockNode[] = this.dataSource.data;

        // recursive find function to find siblings of node
        function findNodeSiblings(arr: Array<BlockNode>, block: BlockNode, compare: any): Array<BlockNode> {
            let result: any, subResult;
            arr.forEach((item, i) => {
                if (compare(item, block)) {
                    result = arr;
                } else if (item.children) {
                    subResult = findNodeSiblings(item.children, block, compare);
                    if (subResult) {
                        result = subResult;
                    }
                }
            });
            return result;
        }

        // determine where to insert the node
        const lastElement =
            event.previousIndex < event.currentIndex &&
            !visibleNodes[event.currentIndex + 1];
        const nodeAtDest =
            event.previousIndex < event.currentIndex
                ? visibleNodes[event.currentIndex + 1] ||
                  visibleNodes[event.currentIndex]
                : visibleNodes[event.currentIndex];
        const newSiblings = findNodeSiblings(changedData, nodeAtDest, this.compare);
        if (!newSiblings) return;
        const node = event.item.data as FlatBlockNode;
        const sameContainer = newSiblings.includes(node.node);
        const insertIndex = newSiblings.findIndex(s => this.compare(s, nodeAtDest));

        // remove the node from its old place
        const siblings = findNodeSiblings(changedData, node.node, this.compare);
        const siblingIndex = siblings.findIndex(n => this.compare(n, node.node));
        const nodeToInsert: BlockNode = siblings.splice(siblingIndex, 1)[0];
        if (nodeAtDest === nodeToInsert) return;

        // ensure validity of drop - must be same level
        const nodeAtDestFlatNode: any = this.treeControl.dataNodes.find((n) => this.compare(nodeAtDest, n.node));
        if (this.validateDrop && nodeAtDestFlatNode.level !== node.level) {
            alert('Items can only be moved within the same level.');
            return;
        }

        // insert node
        newSiblings.splice(
            event.previousIndex < event.currentIndex &&
                sameContainer &&
                !lastElement
                ? insertIndex - 1 < 0
                    ? 0
                    : insertIndex - 1
                : lastElement
                ? insertIndex + 1
                : insertIndex,
            0,
            nodeToInsert
        );

        // rebuild tree with mutated data
        // this.rebuildTreeForData(changedData);
        this.reorder.emit(changedData);
        if (!this.eventsDisabled) {
            this.change.emit();
        }
    }

    setErrors(errors: any) {
        const keys = Object.keys(errors);
        for (let i = 0; i < keys.length; i++) {
            const id = keys[i];
            const node: any = this.treeControl.dataNodes.find((n) => n.node.id === id);
            this.expand(node);
        }
    }

    expand(node: FlatBlockNode) {
        const parent = this.getParent(node);
        if (parent) {
            this.treeControl.expand(parent);
            this.expand(parent);
        }
    }

    /**
     * Iterate over each node in reverse order and return the first node that has a lower level than the passed node.
     */
    getParent(node: FlatBlockNode): FlatBlockNode | null {
        if (!node) {
            return null;
        }

        const { treeControl } = this;
        const currentLevel = treeControl.getLevel(node);

        if (currentLevel < 1) {
            return null;
        }

        const startIndex = treeControl.dataNodes.indexOf(node) - 1;

        for (let i = startIndex; i >= 0; i--) {
            const currentNode = treeControl.dataNodes[i];

            if (treeControl.getLevel(currentNode) < currentLevel) {
                return currentNode;
            }
        }

        return null;
    }

    /**
     * Experimental - opening tree nodes as you drag over them
     */
    dragStart(node?: any) {
        if (node) {
            this.treeControl.collapse(node);
        }
        this.dragging = true;
    }

    dragEnd() {
        this.dragging = false;
    }

    dragHover(node: FlatBlockNode) {
        if (this.dragging) {
            clearTimeout(this.expandTimeout);
            this.expandTimeout = setTimeout(() => {
                this.treeControl.expand(node);
            }, this.expandDelay);
        }
    }

    dragHoverEnd() {
        if (this.dragging) {
            clearTimeout(this.expandTimeout);
        }
    }

    /**
     * The following methods are for persisting the tree expand state
     * after being rebuilt
     */

    rebuildTreeForData(data: BlockNode[]) {
        this.eventsDisabled = true;
        this.blocks = data;
        this.root = data[0];
        this.dataSource.data = data;
        this.treeControl.expansionModel.clear();
        this.expansionModel.selected.forEach((id) => {
            const node: any = this.treeControl.dataNodes.find((n) => n.node.id === id);
            this.treeControl.expand(node);
        });
        if (this.currentBlock) {
            const node: any = this.treeControl.dataNodes.find((n) => n.node.id === this.currentBlock.id);
            if (node) {
                this.currentBlock = node.node;
            } else {
                this.currentBlock = this.root;
            }
        } else {
            this.currentBlock = this.root;
        }
        this.select.emit(this.currentBlock);
        setTimeout(() => {
            this.eventsDisabled = false;
            this.change.emit();
        }, 100);
    }

    getName(node: FlatBlockNode) {
        return node.node.tag;
    }

    getIcon(node: FlatBlockNode) {
        return this.registeredBlocks.getIcon(node.node.blockType);
    }

    getAbout(node: FlatBlockNode) {
        return this.registeredBlocks.getAbout(node.node.blockType, node.node);
    }

    onSelect(event: MouseEvent, node: FlatBlockNode) {
        event.preventDefault();
        event.stopPropagation();
        this.currentBlock = node.node;
        this.select.emit(this.currentBlock);
        if (!this.eventsDisabled) {
            this.change.emit();
        };
        return false;
    }

    onDelete(event: MouseEvent, block: FlatBlockNode) {
        event.preventDefault();
        event.stopPropagation();
        this.delete.emit(block.node);
        if (!this.eventsDisabled) {
            this.change.emit();
        };
        return false;
    }

    isSelect(node: FlatBlockNode) {
        return this.currentBlock == node.node;
    }

    isError(node: FlatBlockNode) {
        if (this.errors && this.errors[node.node.id]) {
            return true;
        }
        return false;
    }

    expandAll() {
        this.isCollapseAll = false;
        this.treeControl.expandAll();
        const values = this.treeControl.expansionModel.selected.map((e: FlatBlockNode) => e.node.id);
        this.expansionModel.select.apply(this.expansionModel, values);
    }

    collapseAll() {
        this.isCollapseAll = true;
        this.treeControl.collapseAll();
        this.expansionModel.clear();
    }

    public selectItem(block: any) {
        if (block) {
            const node: any = this.treeControl.dataNodes.find((n) => n.node.id === block.id);
            if(node) {
                this.currentBlock = node.node;
            } else {
                this.currentBlock = this.root;
            }
        } else {
            this.currentBlock = this.root;
        }
    }

    onVisibleMoreActions(event: MouseEvent, node: FlatBlockNode) {
        this.visibleMoveActions = !this.visibleMoveActions;
        if (this.currentBlock !== node.node) {
            this.onSelect(event, node)
        } else {
            setTimeout(() => this.change.emit(), 10);
        }
    }
}
