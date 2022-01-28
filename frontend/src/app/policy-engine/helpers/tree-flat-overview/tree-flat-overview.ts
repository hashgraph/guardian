import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Injectable, Input, Output, SimpleChanges } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { BehaviorSubject, Observable, of as observableOf } from 'rxjs';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { SelectionModel } from '@angular/cdk/collections';
import { BlockNode } from 'src/app/policy-engine/helpers/tree-data-source/tree-data-source';
import { RegisteredBlocks } from '../../registered-blocks';

/** Flat node with expandable and level information */
export class FlatBlockNode {
  constructor(
    public expandable: boolean,
    public level: number,
    public node: BlockNode
  ) { }
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

  currentBlock!: BlockNode;
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

  constructor(private registeredBlocks: RegisteredBlocks) {
    this.treeFlattener = new MatTreeFlattener(this.transformer, this._getLevel,
      this._isExpandable, this._getChildren);
    this.treeControl = new FlatTreeControl<FlatBlockNode>(this._getLevel, this._isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.rebuildTreeForData(this.blocks);
    if (changes.errors && this.errors) {
      this.setErrors(this.errors);
    }
  }

  transformer = (node: BlockNode, level: number) => {
    return new FlatBlockNode(!!(node.children && node.children.length), level, node);
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

    function addExpandedChildren(node: BlockNode, expanded: string[]) {
      result.push(node);
      if (expanded.includes(node.id)) {
        node.children.map((child) => addExpandedChildren(child, expanded));
      }
    }
    this.dataSource.data.forEach((node) => {
      addExpandedChildren(node, this.expansionModel.selected);
    });
    return result;
  }

  compare(a: BlockNode, b: BlockNode): boolean {
    return a.id == b.id;
  }

  /**
   * Handle the drop - here we rearrange the data based on the drop event,
   * then rebuild the tree.
   * */
  drop(event: CdkDragDrop<string[]>) {
    // ignore drops outside of the tree
    if (!event.isPointerOverContainer) return;

    // construct a list of visible nodes, this will match the DOM.
    // the cdkDragDrop event.currentIndex jives with visible nodes.
    // it calls rememberExpandedTreeNodes to persist expand state
    const visibleNodes = this.visibleNodes();

    // deep clone the data source so we can mutate it
    const changedData: BlockNode[] = JSON.parse(JSON.stringify(this.dataSource.data));

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
    const nodeAtDest = visibleNodes[event.currentIndex];
    const newSiblings = findNodeSiblings(changedData, nodeAtDest, this.compare);
    if (!newSiblings) return;
    const insertIndex = newSiblings.findIndex(s => this.compare(s, nodeAtDest));

    // remove the node from its old place
    const node = event.item.data as FlatBlockNode;
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
    newSiblings.splice(insertIndex, 0, nodeToInsert);

    // rebuild tree with mutated data
    // this.rebuildTreeForData(changedData);
    this.reorder.emit(changedData);
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
  dragStart() {
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
    this.blocks = data;
    this.root = data[0];
    this.currentBlock = this.root;
    this.dataSource.data = data;
    this.expansionModel.selected.forEach((id) => {
      const node: any = this.treeControl.dataNodes.find((n) => n.node.id === id);
      this.treeControl.expand(node);
    });
  }

  getName(node: FlatBlockNode) {
    return node.node.tag;
  }

  getIcon(node: FlatBlockNode) {
    const blockType = node.node.blockType;
    return this.registeredBlocks.getIcon(blockType);
  }

  onSelect(event: MouseEvent, node: FlatBlockNode) {
    event.preventDefault();
    event.stopPropagation();
    this.currentBlock = node.node;
    this.select.emit(this.currentBlock);
    return false;
  }

  onDelete(event: MouseEvent, block: FlatBlockNode) {
    event.preventDefault();
    event.stopPropagation();
    this.delete.emit(block.node);
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
}
