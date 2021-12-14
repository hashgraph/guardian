import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Injectable, Input, Output, SimpleChanges } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { BehaviorSubject, Observable, of as observableOf } from 'rxjs';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { SelectionModel } from '@angular/cdk/collections';
import { BlockNode } from 'src/app/policy-engine/data-source/tree-data-source';

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

  constructor() {
    this.treeFlattener = new MatTreeFlattener(this.transformer, this._getLevel,
      this._isExpandable, this._getChildren);
    this.treeControl = new FlatTreeControl<FlatBlockNode>(this._getLevel, this._isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.rebuildTreeForData(this.blocks);
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
    if (blockType == 'interfaceContainerBlock') {
      return 'tab';
    }
    if (blockType == 'interfaceDocumentsSource') {
      return 'table_view';
    }
    if (blockType == 'informationBlock') {
      return 'info';
    }
    if (blockType == 'requestVcDocument') {
      return 'dynamic_form';
    }
    if (blockType == 'sendToGuardian') {
      return 'send';
    }
    if (blockType == 'interfaceAction') {
      return 'flash_on';
    }
    if (blockType == 'interfaceStepBlock') {
      return 'vertical_split';
    }
    if (blockType == 'mintDocument') {
      return 'paid';
    }
    if (blockType == 'externalDataBlock') {
      return 'cloud';
    }
    if (blockType == 'aggregateDocument') {
      return 'merge_type';
    }
    if (blockType == 'wipeDocument') {
      return 'delete';
    }
    return 'code'
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
}