import { Component, ComponentFactoryResolver, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, SimpleChanges, ViewChild, Inject } from '@angular/core';
import { FlatBlockNode } from '../../structures/tree-model/block-node';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { PolicyBlock, BlocLine, BlockRect, EventCanvas, PolicyFolder, PolicyItem } from '../../structures';
import { RegisteredService } from '../../services/registered.service';
import { ThemeService } from '../../../../services/theme.service';
import { BLOCK_TYPE_TIPS } from 'src/app/injectors/block-type-tips.injector';

enum BlockStyle {
    None = 'None',
    Block = 'Block',
    Module = 'Module',
    Tool = 'Tool',
    RootBlock = 'RootBlock',
    RootModule = 'RootModule',
    RootTool = 'RootTool'
}

const debugMode: string[] = [
    'customLogicBlock',
    'calculateContainerBlock'
];

/**
 * Settings for all blocks.
 */
@Component({
    selector: 'policy-tree',
    templateUrl: './policy-tree.component.html',
    styleUrls: ['./policy-tree.component.scss']
})
export class PolicyTreeComponent implements OnInit {
    @Input('module') module!: PolicyFolder;
    @Input('blocks') blocks!: PolicyBlock[];
    @Input('errors') errors!: any;

    @Input('warnings') warnings!: any;
    @Input('infos') infos!: any;

    @Input('readonly') readonly!: boolean;
    @Input('active') active!: string;
    @Input('connector') dropListConnector!: any;
    @Input('suggestions') isSuggenstionEnabled: boolean = false;
    @Input('nextBlock') nextBlock?: any;
    @Input('nestedBlock') nestedBlock?: any;
    @Input('currentBlock') currentBlock?: any;
    @Input('selectedBlocks') selectedBlocks: Map<string, any>;

    @Output('delete') delete = new EventEmitter();
    @Output('select') select = new EventEmitter<{ block: any, isMultiSelect: boolean }>();
    @Output('reorder') reorder = new EventEmitter();
    @Output('open') open = new EventEmitter();
    @Output('init') init = new EventEmitter();
    @Output('next') next = new EventEmitter();
    @Output('nested') nested = new EventEmitter();
    @Output('currentBlockChange') currentBlockChange = new EventEmitter();
    @Output('search') search = new EventEmitter();
    @Output('test') test = new EventEmitter();

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
    public selectedNode?: FlatBlockNode;
    private errorsTree!: any;

    private warningsTree!: any;
    private infosTree!: any;

    private root!: PolicyBlock;
    private collapsedMap: Map<string, boolean> = new Map<string, boolean>();
    private eventsDisabled = false;
    private paddingLeft = 40;

    private tooltip!: HTMLDivElement;
    private canvas!: EventCanvas;
    private actorMap!: any;
    private tooltipTimeout!: any;

    private _allCollapse: string = '2';
    private _visibleMoveActions: string = '0';
    private _resizeTimer: any = null;

    constructor(
        private registeredService: RegisteredService,
        private element: ElementRef,
        private themeService: ThemeService,
        @Inject(BLOCK_TYPE_TIPS) public blockTypeTips: any
    ) {
        this.actorMap = {};
        this.actorMap[''] = 'Event Initiator';
        this.actorMap['owner'] = 'Document Owner';
        this.actorMap['issuer'] = 'Document Issuer';
        this.errorsTree = {};
        this.warningsTree = {};
        this.infosTree = {};
        try {
            this.collapsedMap.clear();
            this._allCollapse = '2';
            this._visibleMoveActions = '0';
            this._allCollapse = localStorage.getItem('POLICY_TREE_COLLAPSE') || '2';
            this._visibleMoveActions = localStorage.getItem('POLICY_TREE_MENU') || '1';
        } catch (error) {
            console.error(error)
        }
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
        this.init.emit(this);
    }

    ngOnDestroy(): void {
        this.canvas?.destroy();
        this.canvas = undefined as any;

        this.tooltipRef?.nativeElement.remove();
        clearTimeout(this.tooltipTimeout);

        clearTimeout(this._resizeTimer);

        this.data = [];
        this.selectedNode = undefined;
        this.collapsedMap.clear();

        if (this.dropListConnector) {
            this.dropListConnector.body = undefined;
            this.dropListConnector.menu = undefined;
            this.dropListConnector = null as any;
        }

        this.init.complete();
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
        if (changes.currentBlock && Object.keys(changes).length === 1) {
            this.selectedNode = this.data.find(
                (item) => item.node === changes.currentBlock.currentValue
            );
            return;
        }
        this.errorsTree = {};

        this.warningsTree = {};
        this.infosTree = {};

        if (changes.errors && this.errors) {
            this.searchErrors(this.blocks);
        }

        if (changes.warnings && this.warnings) {
            this.searchWarnings(this.blocks);
        }
        if (changes.infos && this.infos) {
            this.searchInfos(this.blocks);
        }

        this.rebuildTree(this.blocks);
        this.scroll();
        this.errorsTree = {};

        this.warningsTree = {};
        this.infosTree = {};

        if (changes.currentBlock) {
            this.selectedNode = this.data.find(
                (item) => item.node === changes.currentBlock.currentValue
            );
        }
    }

    private scroll() {
        if (!this.data) {
          return;
        }

        let idx = this.data.findIndex(n => this.isError(n));

        if (idx === -1) {
          idx = this.data.findIndex(n => this.isWarning(n));
        }

        if (idx === -1) {
            idx = this.data.findIndex(n => this.isInfo(n));
        }

        if (idx > -1) {
            const top = 54 * (idx - 5);
            const parent = this.element?.nativeElement?.parentElement;

            if (parent) {
              parent.scrollTop = top;
            }
        }
    }

    private rebuildTree(data: PolicyBlock[]) {
        this.root = data[0];
        this.data = this.convertToArray([], data, 0, null);

        if (this.currentBlock) {
            this.selectedNode = this.data.find(
                (item) => item.node === this.currentBlock
            );
        }
        this.render(true);
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

    private searchErrors(blocks: PolicyBlock[]): boolean {
        if (!blocks) {
            return false;
        }
        let errors = false;
        for (const block of blocks) {
            const error = this.searchErrors(block.children);
            if (error) {
                this.errorsTree[block.id] = true;
                errors = true;
            }
            if (this.errors[block.id]) {
                errors = true;
            }
        }
        return errors;
    }

    private searchWarnings(blocks: PolicyBlock[]): boolean {
        if (!blocks) return false;
        let hit = false;
        for (const block of blocks) {
            const childHit = this.searchWarnings(block.children);
            if (childHit) {
                this.warningsTree[block.id] = true;
                hit = true;
            }
            if (this.warnings && this.warnings[block.id]) hit = true;
        }
        return hit;
    }

    private searchInfos(blocks: PolicyBlock[]): boolean {
        if (!blocks) return false;
        let hit = false;
        for (const block of blocks) {
            const childHit = this.searchInfos(block.children);
            if (childHit) {
                this.infosTree[block.id] = true;
                hit = true;
            }
            if (this.infos && this.infos[block.id]) hit = true;
        }
        return hit;
    }

    private convertToArray(
        result: FlatBlockNode[],
        blocks: PolicyBlock[],
        level: number,
        parent: FlatBlockNode | null
    ): FlatBlockNode[] {
        if (!blocks) {
            return result;
        }
        let prevNode: any = undefined;
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const next = blocks[i + 1];
            const prev = blocks[i - 1];
            const node = new FlatBlockNode(block);
            node.prev = prev;
            node.next = next;
            node.level = level;
            node.root = block === this.root;
            node.expandable = block.expandable && !node.root;
            node.deprecated = this.registeredService.getDeprecated(block.blockType);
            node.about = this.registeredService.getAbout(block, this.module);
            node.icon = this.registeredService.getIcon(block.blockType);
            node.type = this.registeredService.getHeader(block.blockType);
            node.collapsed = this.getCollapsed(node);
            node.error = this.isError(node);

            node.warning = this.isWarning(node);
            node.info = this.isInfo(node);

            if (parent) {
                node.parent = parent.node;
                node.parentNode = parent;
            }
            node.prevNode = prevNode;
            node.canAddModules = this.canAddModules(node, block);
            node.canAddTools = this.canAddTools(node, block);
            node.canAddBlocks = this.canAddBlocks(node, block);
            node.canUp = this.canUp(node, block);
            node.canDown = this.canDown(node, block);
            node.canLeft = this.canLeft(node, block);
            node.canRight = this.canRight(node, block);
            node.offset = `${this.paddingLeft * level}px`;
            if (node.root) {
                if (node.isModule) {
                    node.style = BlockStyle.RootModule;
                } else if (node.isTool) {
                    node.style = BlockStyle.RootTool;
                } else {
                    node.style = BlockStyle.RootBlock;
                }
            } else {
                if (node.isModule) {
                    node.style = BlockStyle.Module;
                } else if (node.isTool) {
                    node.style = BlockStyle.Tool;
                } else {
                    node.style = BlockStyle.Block;
                }
            }
            prevNode = node;
            block.setAbout(node.about);

            result.push(node);
            this.collapsedMap.set(node.id, node.collapsed);

            if (this.errorsTree[block.id] || this.warningsTree[block.id] || this.infosTree[block.id]) {
                node.collapsed = false;
                this.collapsedMap.set(node.id, node.collapsed);
            }

            if (this.ifCanHaveChildren(node, block)) {
                result = this.convertToArray(result, block.children, level + 1, node);
            }
        }
        return result;
    }

    private canAddModules(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            if (block.isModule) {
                return false;
            }
            if (block.isTool) {
                return false;
            }
            return true;
        } else {
            if (block.isModule) {
                return false;
            }
            if (block.isTool) {
                return false;
            }
            return true;
        }
    }

    private canAddTools(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            if (block.isModule) {
                return true;
            }
            if (block.isTool) {
                return true;
            }
            return true;
        } else {
            if (block.isModule) {
                return false;
            }
            if (block.isTool) {
                return false;
            }
            return true;
        }
    }

    private canAddBlocks(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            if (block.isModule) {
                return true;
            }
            if (block.isTool) {
                return true;
            }
            return true;
        } else {
            if (block.isModule) {
                return false;
            }
            if (block.isTool) {
                return false;
            }
            return true;
        }
    }

    private ifCanHaveChildren(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            return true;
        }
        if (node.collapsed) {
            return false;
        }
        if (block.isModule || block.isTool) {
            return false;
        }
        return true;
    }

    private canUp(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            return false;
        }
        if (node.prevNode) {
            return true;
        }
        return false;
    }

    private canDown(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            return false;
        }
        if (node.next) {
            return true;
        }
        return false;
    }

    private canLeft(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            return false;
        }
        if (node.parentNode && !node.parentNode.root) {
            return true;
        }
        return false;
    }

    private canRight(node: FlatBlockNode, block: PolicyItem): boolean {
        if (node.root) {
            return false;
        }
        if (node.prevNode) {
            if (block.isModule) {
                return node.prevNode.canAddModules;
            }
            if (block.isTool) {
                return node.prevNode.canAddTools;
            }
            return node.prevNode.canAddBlocks;
        }
        return false;
    }

    public isRootModuleStyle(node: FlatBlockNode): boolean {
        return node.style === BlockStyle.RootModule;
    }

    public isRootToolStyle(node: FlatBlockNode): boolean {
        return node.style === BlockStyle.RootTool;
    }

    public isRootBlockStyle(node: FlatBlockNode): boolean {
        return node.style === BlockStyle.RootBlock;
    }

    public isModuleStyle(node: FlatBlockNode): boolean {
        return node.style === BlockStyle.Module;
    }

    public isToolStyle(node: FlatBlockNode): boolean {
        return node.style === BlockStyle.Tool;
    }

    public isBlockStyle(node: FlatBlockNode): boolean {
        return node.style === BlockStyle.Block;
    }

    public isTest(node: FlatBlockNode): boolean {
        return this.module?.isTest && debugMode.includes(node.node?.blockType);
    }

    public isSelect(node: FlatBlockNode) {
        return this.currentBlock === node?.node;
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

    public isWarning(node: FlatBlockNode): boolean {
        if (this.isError(node)) {
          return false;
        }

        const id = node.node.id;

        return !!this.warnings?.[id];
    }

    public isInfo(node: FlatBlockNode): boolean {
        if (this.isError(node)) {
          return false;
        }

        if (this.isWarning(node)) {
            return false;
        }
        const id = node.node.id;

        return !!this.infos?.[id];
    }

    public blockStyle(node: FlatBlockNode): any {
        return this.themeService.getStyle(node.node);
    }

    public getMenu(node: FlatBlockNode): string {
        let style = 'block-menu';
        if (this.readonly) {
            if (this.isTest(node)) {
                style += '-1';
            } else {
                style += '-0';
            }
        } else {
            if (this.isTest(node)) {
                style += '-4';
            } else {
                style += '-3';
            }
            if (this.visibleMoveActions === '1') {
                style += '-full';
            }
        }
        return style;
    }

    public onSelect(event: MouseEvent, node: FlatBlockNode) {
        const isMultiSelect = event.shiftKey;
        this.selectedNode = node;
        this.currentBlock = node.node;
        this.render();
        this.select.emit({ block: this.currentBlock, isMultiSelect});
        this.currentBlockChange.emit(this.currentBlock);
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
                this.canvas.clampPosition(position);
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
            return item.input === 'RefreshEvent' || item.output === 'RefreshEvent';
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

    public onSearch(event: any) {
        event.preventDefault();
        event.stopPropagation();
        this.search.emit(this.currentBlock);
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

    public onTest(event: any) {
        event.preventDefault();
        event.stopPropagation();
        this.test.emit(this.currentBlock);
        return false;
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
            data.startsWith('new:') ||
            data.startsWith('module:') ||
            data.startsWith('tool:')
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

    @HostListener('window:resize', ['$event'])
    public onResize(event: any) {
        if (this._resizeTimer) {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = null;
        }
        this._resizeTimer = setTimeout(() => {
            this._resizeTimer = null;
            this.render();
        }, 200);
    }

    public isLatestBlockInSelect(block: any) {
        if (!this.selectedNode) {
            return false;
        }
        let current: any = this.selectedNode;
        for (
            let i = this.data.indexOf(current);
            i < this.data.length;
            i++
        ) {
            const next = this.data[i + 1];
            if (!next || next.level < this.selectedNode!.level) {
                break;
            }
            current = next;
        }
        return current === block;
    }

    public getNestedOffset(nodeLevel: number) {
        return `${this.paddingLeft * nodeLevel}px`;
    }

    public isBlockSelected(node: any): boolean {
        return this.selectedBlocks.has(node.id);
    }

    public hasTags(node: any): boolean {
        return node?.node?._tags?.length > 0;
    }

    public getTagsAmount(node: any): number {
        return node?.node?._tags?.length || 0;
    }
}
