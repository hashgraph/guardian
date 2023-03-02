import { Component, ComponentFactoryResolver, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { FlatBlockNode } from '../../structures/tree-model/block-node';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { PolicyBlockModel, BlocLine, BlockRect, EventCanvas, PolicyModel, PolicyModuleModel } from '../../structures';
import { RegisteredService } from '../../registered-service/registered.service';

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'policy-tree',
    templateUrl: './policy-tree.component.html',
    styleUrls: ['./policy-tree.component.css']
})
export class PolicyTreeComponent implements OnInit {
    @Input('module') module!: PolicyModel | PolicyModuleModel;
    @Input('blocks') blocks!: PolicyBlockModel[];
    @Input('errors') errors!: any;
    @Input('readonly') readonly!: boolean;
    @Input('active') active!: string;
    @Input('connector') dropListConnector!: any;

    @Output('delete') delete = new EventEmitter();
    @Output('select') select = new EventEmitter();
    @Output('reorder') reorder = new EventEmitter();
    @Output('open') open = new EventEmitter();
    @Output('init') init = new EventEmitter();

    @ViewChild('parent') parentRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLDivElement>;


    @ViewChild('treeList')
    public set treeList(value: CdkDropList<any> | undefined) {
        if (this.dropListConnector) {
            this.dropListConnector.body = value;
        }
    }
    public get treeList(): CdkDropList<any> | undefined {
        if (this.dropListConnector) {
            return this.dropListConnector.body;
        } else {
            return undefined;
        }
    }
    public get menuList(): CdkDropList<any> | string {
        if (this.dropListConnector) {
            return this.dropListConnector.menu;
        } else {
            return '';
        }
    }

    public data!: FlatBlockNode[];

    private root!: PolicyBlockModel;
    private currentBlock!: PolicyBlockModel;
    private collapsedMap: Map<string, boolean> = new Map<string, boolean>();
    private eventsDisabled = false;
    private paddingLeft = 40;

    private tooltip!: HTMLDivElement;
    private canvas!: EventCanvas;
    private actorMap!: any;
    private tooltipTimeout!: any;

    private _allCollapse: string = '2';
    private _visibleMoveActions: string = '0';

    constructor(
        private registeredService: RegisteredService,
        private element: ElementRef,
        private componentFactoryResolver: ComponentFactoryResolver
    ) {
        this.actorMap = {};
        this.actorMap[''] = 'Event Initiator';
        this.actorMap['owner'] = 'Document Owner';
        this.actorMap['issuer'] = 'Document Issuer';
    }

    public get allCollapse() {
        return this._allCollapse;
    }

    public set allCollapse(value: string) {
        if (this._allCollapse != value) {
            this._allCollapse = value;
            try {
                localStorage.setItem('POLICY_TREE_COLLAPSE', this._allCollapse);
            } catch (error) {
                console.error(error);
            }
        }
    }

    public get visibleMoveActions() {
        return this._visibleMoveActions;
    }

    public set visibleMoveActions(value: string) {
        if (this._visibleMoveActions != value) {
            this._visibleMoveActions = value;
            try {
                localStorage.setItem('POLICY_TREE_MENU', this._visibleMoveActions);
            } catch (error) {
                console.error(error);
            }
        }
    }

    ngOnInit(): void {
        this.collapsedMap.clear();
        try {
            this._allCollapse = '2';
            this._visibleMoveActions = '0';
            this._allCollapse = localStorage.getItem('POLICY_TREE_COLLAPSE') || '2';
            this._visibleMoveActions = localStorage.getItem('POLICY_TREE_MENU') || '1';
        } catch (error) {
            console.error(error)
        }
        this.init.emit(this);
    }

    ngAfterViewInit(): void {
        this.tooltip = this.tooltipRef?.nativeElement;
        this.canvas = new EventCanvas(
            this.element.nativeElement,
            this.parentRef?.nativeElement,
            this.canvasRef?.nativeElement,
        );
        this.canvas.resize();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.rebuildTree(this.blocks);
        if (changes.errors && this.errors) {
            this.setErrors(this.errors);
        }
    }

    rebuildTree(data: PolicyBlockModel[]) {
        this.root = data[0];
        this.data = this.convertToArray([], data, 0, null);
        this.render(true);
    }

    setErrors(errors: any) {

    }

    private getCollapsed(node: FlatBlockNode): boolean {
        if (node.expandable) {
            if (this.allCollapse === '2') {
                return true;
            }
            if (this.allCollapse === '1') {
                return false;
            }
            return this.collapsedMap.get(node.id) !== false;
        }
        return false;
    }

    convertToArray(
        result: FlatBlockNode[],
        blocks: PolicyBlockModel[],
        level: number,
        parent: any
    ): FlatBlockNode[] {
        if (!blocks) {
            return result;
        }
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const next = blocks[i - 1];
            const prev = blocks[i + 1];
            const node = new FlatBlockNode(block);
            node.prev = prev;
            node.next = next;
            node.level = level;
            node.root = block === this.root;
            node.expandable = block.expandable && !node.root;
            node.about = this.registeredService.getAbout(block, this.module);
            node.icon = this.registeredService.getIcon(block.blockType);
            node.type = this.registeredService.getHeader(block.blockType);
            node.collapsed = this.getCollapsed(node);
            node.parent = parent;
            node.offset = `${this.paddingLeft * level}px`;
            block.setAbout(node.about);

            result.push(node);
            this.collapsedMap.set(node.id, node.collapsed);

            if (!node.collapsed && (!block.isModule || node.root)) {
                result = this.convertToArray(
                    result,
                    block.children,
                    level + 1,
                    block
                );
            }
        }
        return result;
    }

    public isSelect(node: FlatBlockNode) {
        return this.currentBlock == node.node;
    }

    public isFinal(node: FlatBlockNode) {
        return node.node?.isFinal();
    }

    public isError(node: FlatBlockNode) {
        if (this.errors && this.errors[node.node.id]) {
            return true;
        }
        return false;
    }

    public onSelect(event: MouseEvent, node: FlatBlockNode) {
        this.currentBlock = node.node;
        this.render();
        this.select.emit(this.currentBlock);
        return false;
    }

    public onOpen(event: MouseEvent, node: FlatBlockNode) {
        this.open.emit(node.node);
        return false;
    }

    public onCollapse(event: MouseEvent, node: FlatBlockNode) {
        event.preventDefault();
        event.stopPropagation();
        this.allCollapse = '0';
        node.collapsed = !node.collapsed;
        this.collapsedMap.set(node.id, node.collapsed);
        this.rebuildTree(this.blocks);
        return false;
    }

    public mousemove(event: MouseEvent) {
        if (this.tooltip && this.canvas && this.canvas.valid) {
            const position = this.canvas.getPosition(event);
            const index = this.canvas.getIndexObject(position);
            const line = this.canvas.selectLine(index);
            if (line) {
                this.tooltip.innerHTML = `
                    <div class="s1"><span>Source (Block Tag)</span>: ${line.startTag}</div>
                    <div class="s2"><span>Output (Event)</span>: ${line.output}</div>
                    <div class="s3"><span>Target (Block Tag)</span>: ${line.endTag}</div>
                    <div class="s4"><span>Input (Event)</span>: ${line.input}</div>
                    <div class="s5"><span>Event Actor</span>: ${this.actorMap[line.actor]}</div>
                `;
                this.tooltip.style.left = `${position.x}px`;
                this.tooltip.style.top = `${position.y}px`;
                if (position.y > 200) {
                    this.tooltip.style.transform = 'translate(-50%, -100%) translate(0, -8px)';
                } else {
                    this.tooltip.style.transform = 'translate(-50%, 0%) translate(0, 20px)';
                }
                this.showTooltip(true);
            } else {
                this.tooltip.innerHTML = '';
                this.showTooltip(false);
            }
        } else {
            this.showTooltip(false);
        }
    }

    public mouseleave(event: MouseEvent) {
        if (this.canvas && this.canvas.valid) {
            this.canvas.selectLine(-1);
        }
        this.showTooltip(false);
    }

    private showTooltip(value: boolean) {
        if (this.tooltip) {
            clearTimeout(this.tooltipTimeout);
            if (value) {
                this.tooltip.style.display = 'block';
                this.tooltip.style.opacity = '0';
                this.tooltipTimeout = setTimeout(() => {
                    this.tooltip.style.opacity = '1';
                }, 500);
            } else {
                this.tooltip.style.display = 'none';
                this.tooltip.style.opacity = '0';
            }
        }
    }

    public render(fastClear = false) {
        if (this.canvas && this.canvas.valid) {
            if (fastClear) {
                this.canvas.clear();
            } else {
                if (this.active === 'None') {
                    return;
                }
            }
            setTimeout(() => {
                const boxCanvas = this.canvas.resize();
                const renderLine = this.createEventsLines(this.data, boxCanvas);
                this.canvas.setData(renderLine);
                this.canvas.render();
            });
        }
    }

    private createEventsLines(data: FlatBlockNode[], boxCanvas?: DOMRect): BlocLine[] {
        let minOffset = 0;
        const blockMap: any = {};
        for (const block of data) {
            const div = document.querySelector(`.block-container[block-id="${block.id}"] .block-body`);
            if (block.node.tag && div) {
                const box = div.getBoundingClientRect();
                const blocRect = new BlockRect(box, boxCanvas);
                blockMap[block.node.tag] = blocRect;
                minOffset = Math.max(minOffset, blocRect.right.x);
            }
        }
        minOffset += 50;
        const lines: BlocLine[] = [];
        for (const node of data) {
            const block = node.node;
            for (const event of block.getActiveEvents()) {
                if (this.checkType(event)) {
                    const start = blockMap[event.sourceTag];
                    const end = blockMap[event.targetTag];
                    if (start && end) {
                        const line = new BlocLine(start, end, event.default);
                        line.dash = event.input == 'RefreshEvent' || event.output == 'RefreshEvent';
                        line.startTag = event.sourceTag;
                        line.endTag = event.targetTag;
                        line.actor = event.actor;
                        line.input = event.input;
                        line.output = event.output;
                        lines.push(line);
                    }
                }
            }
        }
        return this.sortLine(lines, minOffset);
    }

    private checkType(item: any): boolean {
        if (this.active === 'All') {
            return true;
        }
        if (this.active === 'Action') {
            return item.input !== 'RefreshEvent' && item.output !== 'RefreshEvent';
        }
        if (this.active === 'Refresh') {
            return item.input === 'RefreshEvent' || item.output !== 'RefreshEvent';
        }
        return false;
    }

    private sortLine(lines: BlocLine[], minOffset: number): BlocLine[] {
        let shortLines = [];
        let otherLines = [];

        for (const line of lines) {
            line.selectBlock(this.currentBlock?.tag);
            if (line.short) {
                shortLines.push(line);
            } else {
                otherLines.push(line);
            }

        }

        const renderLine = [];
        for (const line of shortLines) {
            line.calc(line.direction ? line.minOffset : line.minOffset + 10);
            if (line.selected) {
                renderLine.push(line);
            } else {
                renderLine.unshift(line);
            }
        }

        otherLines = otherLines.sort((a, b) => a.height > b.height ? 1 : -1);

        const mapRight: any = {};
        for (const line of otherLines) {
            let offset = minOffset;
            for (let i = 0; mapRight[offset] && i < 200; i++) {
                offset += 8;
            }
            mapRight[offset] = true;
            line.calc(offset);
            if (line.selected) {
                renderLine.push(line);
            } else {
                renderLine.unshift(line);
            }
        }

        return renderLine;
    }

    public onAllCollapse() {
        if (this.allCollapse === '2') {
            this.allCollapse = '1';
        } else {
            this.allCollapse = '2';
        }
        this.collapsedMap.clear();
        this.rebuildTree(this.blocks);
        return false;
    }

    public onDelete(event: any) {
        event.preventDefault();
        event.stopPropagation();
        this.delete.emit(this.currentBlock);
        return false;
    }

    public onVisibleMoreActions(event: any) {
        if (this.visibleMoveActions === '1') {
            this.visibleMoveActions = '0';
        } else {
            this.visibleMoveActions = '1';
        }
        this.render();
    }

    public onDropUp(event: any) {
        this.moveBlockUpDown(-1)
    }

    public onDropDown(event: any) {
        this.moveBlockUpDown(1)
    }

    public onDropLeft(event: any) {
        this.onMoveBlockLeft()
    }

    public onDropRight(event: any) {
        this.onMoveBlockRight()
    }

    private moveBlockUpDown(position: number) {
        const parent = this.currentBlock?.parent;
        if (parent && parent.children) {
            const currentBlockIndex = this.currentBlock.index();
            const newIndex = currentBlockIndex + position;
            if (parent.children[newIndex]) {
                parent.children[currentBlockIndex] = parent.children[newIndex];
                parent.children[newIndex] = this.currentBlock;
                parent.refresh();
                if (position < 0) {
                    this.reorderEvent('top');
                } else {
                    this.reorderEvent('bottom');
                }
            }
        }
    }

    private onMoveBlockLeft() {
        const parent = this.currentBlock?.parent;
        const parent2 = this.currentBlock?.parent2;
        if (parent && parent2) {
            const parentIndex = parent.index();
            parent.removeChild(this.currentBlock);
            parent2.addChild(this.currentBlock, parentIndex + 1);
            this.reorder.emit(this.reorderEvent('left'));
        }
    }

    private onMoveBlockRight() {
        const parent = this.currentBlock?.parent;
        if (parent && parent.children) {
            const prev = this.currentBlock.prev;
            if (prev) {
                parent.removeChild(this.currentBlock);
                prev.addChild(this.currentBlock);
                this.reorder.emit(this.reorderEvent('right'));
            }
        }
    }

    public drop(event: any) {
        const data = event.item.data;
        if (typeof data === 'string' && (
            data.startsWith('new:') || data.startsWith('module:')
        )) {
            const [operation, name] = data.split(':');
            const prev = this.data[event.currentIndex - 1];
            const next = this.data[event.currentIndex];
            if (
                prev.node.isRoot ||
                prev.node === this.root ||
                (next && next.level > prev.level)
            ) {
                this.reorder.emit(this.reorderEvent('add', {
                    operation,
                    name,
                    parent: prev.node,
                    index: -1
                }));
            } else {
                this.reorder.emit(this.reorderEvent('add', {
                    operation,
                    name,
                    parent: prev.node.parent,
                    index: prev.node.index() + 1
                }));
            }
        } else {
            const block = this.data[event.previousIndex];
            const items = this.data.filter((e: any) => e != block);
            const prev = items[event.currentIndex - 1];
            const next = items[event.currentIndex];
            if (next && next.level > prev.level) {
                block.node.appendTo(prev.node, -1);
            } else {
                block.node.appendTo(prev.node.parent, prev.node.index() + 1);
            }
            this.reorder.emit(this.reorderEvent('reorder'));
        }
    }

    public onDragSorted(event: any) {
        const index = event.currentIndex;
        const items = event.container
            .getSortedItems()
            .filter((e: any) => e != event.item);
        const prev = items[index - 1]?.data;
        const next = items[index]?.data;
        const lvl = Math.max(1, next && next > prev ? next : prev);
        const placeholder = event.item.getPlaceholderElement()
        placeholder.style.paddingLeft = `${40 * lvl}px`;
    }

    public onDragEntered(event: any) {
        const index = event.currentIndex;
        const items = event.container
            .getSortedItems()
            .filter((e: any) => e != event.item);
        const prev = items[index - 1]?.data;
        const next = items[index]?.data;
        const lvl = Math.max(1, next && next > prev ? next : prev);
        const placeholder = event.item.getPlaceholderElement()
        placeholder.style.paddingLeft = `${40 * lvl}px`;
    }

    public onDragSortPredicate(index: number): boolean {
        return index > 0;
    }

    private reorderEvent(type: string, data?: any): any {
        return { type, data };
    }
}
