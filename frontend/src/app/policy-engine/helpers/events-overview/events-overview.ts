import { Component, ElementRef, EventEmitter, HostListener, Injectable, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PolicyBlockModel, PolicyEventModel, PolicyModel } from '../../structures/policy-model';
import { RegisteredBlocks } from '../../registered-blocks';
import { TreeFlatOverview } from '../tree-flat-overview/tree-flat-overview';

@Component({
    selector: 'events-overview',
    templateUrl: 'events-overview.html',
    styleUrls: ['events-overview.css']
})
export class EventsOverview {
    @Input('policy') policy!: PolicyModel;
    @Input('active') active!: string;
    @Input('selected') selected!: any;
    @Input('context') context!: any;

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLDivElement>;
    @Output('init') init = new EventEmitter();

    _parent!: Element;
    _canvas!: HTMLCanvasElement;
    _context!: CanvasRenderingContext2D | null;
    _tooltip!: HTMLDivElement;

    blockMap: any;
    lastImages: any;
    actorMap: any;

    constructor(
        private element: ElementRef,
        private registeredBlocks: RegisteredBlocks) {
        this.actorMap = {};
        this.actorMap[''] = 'Event Initiator';
        this.actorMap['owner'] = 'Document Owner';
        this.actorMap['issuer'] = 'Document Issuer';
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.context) {
            this.setContext(this.context);
        }
        if (changes.active) {
            this.render();
        }
    }

    ngAfterViewInit(): void {
        this._tooltip = this.tooltipRef?.nativeElement;
        this._canvas = this.canvasRef?.nativeElement;
        this._context = this._canvas?.getContext('2d');
        this.refreshCanvas();
        this.init.emit(this);
    }

    ngOnDestroy(): void {
        this.init.emit(null);
    }

    private setContext(context: TreeFlatOverview) {
        if (context && context.context) {
            this._parent = context.context.nativeElement;
        }
    }

    public render(): void {
        if (!this._canvas || !this._context) {
            return;
        }
        if (this.active === 'None') {
            this.renderData([]);
            this.renderLine();
            return;
        }
        const boxCanvas = this.refreshCanvas();
        const map = this.getBlockSize(this.policy.allBlocks, boxCanvas);
        const lines = this.getLines(map, this.policy.allBlocks, this.policy.allEvents);
        const renderLine = this.sortLine(lines);
        this.renderData(renderLine);
        this.renderLine();
    }

    private renderData(renderLine: any[]) {
        if (!this._canvas || !this._context) {
            return;
        }
        for (let index = 0; index < renderLine.length; index++) {
            const line = renderLine[index];
            line.index = index + 1;
            this.drawData(line);
        }
        const data = this._context.getImageData(0, 0, this._canvas.width, this._canvas.height).data;
        this.lastImages = {
            context: this._context,
            lines: renderLine,
            width: this._canvas.width,
            height: this._canvas.height,
            data: data
        }
    }

    private renderLine() {
        if (!this._canvas || !this._context || !this.lastImages) {
            return;
        }

        this.lastImages.context.clearRect(0, 0, this.lastImages.width, this.lastImages.height);

        for (let index = 0; index < this.lastImages.lines.length; index++) {
            const line = this.lastImages.lines[index];
            const selected = this.lastImages.index == line.index;
            this.drawArrow(line, line.dash, selected);
        }
    }

    private refreshCanvas() {
        if (this._canvas && this._parent) {
            this._canvas.setAttribute('id', 'tree-canvas');
            this._canvas.style.position = 'absolute';
            this._canvas.style.top = '0px';
            this._canvas.style.left = '0px';
            // this._canvas.style.pointerEvents = 'none';
            const box = this._parent.getBoundingClientRect();
            this._canvas.style.width = `${box.width}px`;
            this._canvas.style.height = `${box.height}px`;
            this._canvas.width = box.width;
            this._canvas.height = box.height;
            if (this._context) {
                this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
            }
            return this._canvas.getBoundingClientRect();
        }
        return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    }

    private getBlockSize(blocks: PolicyBlockModel[], boxCanvas: any) {
        const blockMap: any = {};
        for (const block of blocks) {
            const item: any = {
                tag: block.tag,
                events: block.events,
                next: block.next?.tag,
                prev: block.prev?.tag,
            }
            const div = document.querySelector(`*[block-instance="${block.tag}"]`);
            if (div) {
                const box = div.getBoundingClientRect();
                item.div = div;
                item.leftOffset = boxCanvas.left;
                item.topOffset = boxCanvas.top;
                item.left = box.left || 0;
                item.right = box.right || 0;
                item.top = box.top || 0;
                item.bottom = box.bottom || 0;
                item.width = box.width || 0;
                item.height = box.height || 0;
            }
            blockMap[item.tag] = item;
        }
        return blockMap;
    }

    private getLines(blockMap: any, allBlocks: PolicyBlockModel[], allEvents: PolicyEventModel[]) {
        let minWidthOffset = 0;
        for (const item of allBlocks) {
            const block = blockMap[item.tag];
            if (block.div) {
                minWidthOffset = Math.max(minWidthOffset, block.right - block.leftOffset);
            }
        }
        minWidthOffset += 50;

        const lines = [];
        if (allBlocks) {
            for (const item of allBlocks) {
                const block = blockMap[item.tag];
                const about = this.registeredBlocks.getAbout(item.blockType, item);
                if (!item.properties.stopPropagation && about.defaultEvent && this.checkType(item)) {
                    const line = this.createLine(blockMap, item.tag, block.next);
                    if (line) {
                        line.actor = '';
                        line.input = 'RunEvent';
                        line.output = 'RunEvent';
                        line.dash = false;
                        line.default = true;
                        line.widthOffset = minWidthOffset;
                        lines.push(line);
                    }
                }
            }
        }
        if (allEvents) {
            for (const item of allEvents) {
                if (!item.disabled && this.checkType(item)) {
                    const line = this.createLine(blockMap, item.sourceTag, item.targetTag);
                    if (line) {
                        line.actor = item.actor;
                        line.input = item.input;
                        line.output = item.output;
                        line.dash = item.input == 'RefreshEvent';
                        line.widthOffset = minWidthOffset;
                        lines.push(line);
                    }
                }
            }
        }

        return lines;
    }

    private checkType(item: any): boolean {
        if (this.active === 'All') {
            return true;
        }
        if (this.active === 'Action') {
            return item.input !== 'RefreshEvent';
        }
        if (this.active === 'Refresh') {
            return item.input === 'RefreshEvent';
        }
        return false;
    }

    private createLine(blockMap: any, startTag: string, endTag: string): any {
        if (!startTag || !endTag) {
            return null;
        }
        const start = blockMap[startTag];
        const end = blockMap[endTag];
        if (!start || !start.div || !end || !end.div) {
            return null;
        }
        const minWidth = 150;
        return {
            start_top_x: Math.round(start.left + (minWidth / 2) - start.leftOffset),
            start_top_y: Math.round(start.top - start.topOffset - 6),
            start_bottom_x: Math.round(start.left + (minWidth / 2) - start.leftOffset),
            start_bottom_y: Math.round(start.top + start.height - start.topOffset + 2),
            start_right_x: Math.round(start.right - start.leftOffset + 32),
            start_right_y: Math.round(start.top - start.topOffset + 16 + 6),
            end_top_x: Math.round(end.left + (minWidth / 2) - start.leftOffset),
            end_top_y: Math.round(end.top - start.topOffset - 6),
            end_bottom_x: Math.round(end.left + (minWidth / 2) - start.leftOffset),
            end_bottom_y: Math.round(end.top + end.height - start.topOffset + 2),
            end_right_x: Math.round(end.right - start.leftOffset + 32),
            end_right_y: Math.round(end.top - start.topOffset + 16 - 6),
            startTag: startTag,
            endTag: endTag,
            offset: 4,
            widthOffset: 0,
            direction: start.top < end.top,
            height: Math.abs(start.top - end.top),
            default: false,
            selected: false,
            selectedS: false,
            selectedE: false,
            color: [136, 136, 136],
            points: null,
            dash: false
        }
    }

    private sortLine(lines: any[]): any[] {
        let defaultLines = [];
        let shortLines = [];
        let otherLines = [];
        for (const line of lines) {
            line.selectedS = line.startTag == this.selected?.tag;
            line.selectedE = line.endTag == this.selected?.tag;
            line.selected = line.selectedS || line.selectedE;
            if (line.selectedS) {
                line.color = [225, 0, 0];
            } else if (line.selectedE) {
                line.color = [0, 128, 0];
            } else {
                line.color = [136, 136, 136];
            }

            if (line.default && line.height < 55) {
                defaultLines.push(line);
            } else if (line.height < 55) {
                shortLines.push(line);
            } else {
                otherLines.push(line);
            }
        }
        otherLines = otherLines.sort((a, b) => a.height > b.height ? 1 : -1);
        const mapRight: any = {};
        for (const line of otherLines) {
            for (let i = 0; mapRight[line.widthOffset] && i < 100; i++) {
                line.widthOffset = line.widthOffset + 8;
            }
            mapRight[line.widthOffset] = true;
        }

        const renderLine = [];
        for (const line of defaultLines) {
            if (line.direction) {
                line.points = [
                    line.start_bottom_x, line.start_bottom_y,
                    line.end_top_x, line.end_top_y
                ]
            } else {
                line.points = [
                    line.start_top_x, line.start_top_y,
                    line.end_bottom_x, line.end_bottom_y
                ]
            }
            if (line.selected) {
                renderLine.push(line);
            } else {
                renderLine.unshift(line);
            }
        }
        for (const line of shortLines) {
            line.points = [
                line.start_right_x, line.start_right_y,
                line.widthOffset, line.start_right_y,
                line.widthOffset, line.end_right_y,
                line.end_right_x, line.end_right_y
            ]

            if (line.selected) {
                renderLine.push(line);
            } else {
                renderLine.unshift(line);
            }
        }
        for (const line of otherLines) {
            line.points = [
                line.start_right_x, line.start_right_y,
                line.widthOffset, line.start_right_y,
                line.widthOffset, line.end_right_y,
                line.end_right_x, line.end_right_y
            ]

            if (line.selected) {
                renderLine.push(line);
            } else {
                renderLine.unshift(line);
            }
        }
        return renderLine;
    }

    private drawData(line: any) {
        if (!this._context) {
            return;
        }
        const ctx = this._context;
        const points = line.points;
        const color = this.toColor(line.index);
        ctx.save();
        ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},255)`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.setLineDash([]);
        let fx: number = 0, fy: number = 0, tx: number = 0, ty: number = 0;
        for (let i = 0; i < points.length - 3; i += 2) {
            fx = points[i];
            fy = points[i + 1];
            tx = points[i + 2];
            ty = points[i + 3];
            ctx.moveTo(fx, fy);
            ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.restore();
    }

    private drawArrow(line: any, dash: boolean = false, selected: boolean = false) {
        if (!this._context) {
            return;
        }

        const ctx = this._context;
        const points = line.points;

        ctx.save();
        if (selected) {
            ctx.strokeStyle = `rgb(0,0,255)`;
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = `rgb(${line.color[0]},${line.color[1]},${line.color[2]})`;
            ctx.lineWidth = line.selected ? 3 : 1;
        }
        ctx.beginPath();
        if (dash) {
            ctx.setLineDash([10, 5]);
        } else {
            ctx.setLineDash([]);
        }

        let fx: number = 0, fy: number = 0, tx: number = 0, ty: number = 0;
        for (let i = 0; i < points.length - 3; i += 2) {
            fx = points[i];
            fy = points[i + 1];
            tx = points[i + 2];
            ty = points[i + 3];
            ctx.moveTo(fx, fy);
            ctx.lineTo(tx, ty);
        }
        const angle = Math.atan2(ty - fy, tx - fx);
        const k = Math.PI / 7;
        const headlen = 5;
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - headlen * Math.cos(angle - k), ty - headlen * Math.sin(angle - k));
        ctx.lineTo(tx - headlen * Math.cos(angle + k), ty - headlen * Math.sin(angle + k));
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx - headlen * Math.cos(angle - k), ty - headlen * Math.sin(angle - k));
        ctx.stroke();
        ctx.restore();
    }

    mousemove(event: MouseEvent) {
        if (this.lastImages) {
            const idx = (event.offsetY * this.lastImages.width + event.offsetX) * 4;
            const a = this.lastImages.data[idx + 3];
            let index = 0;
            if (a == 255) {
                const r = this.lastImages.data[idx];
                const g = this.lastImages.data[idx + 1];
                const b = this.lastImages.data[idx + 2];
                index = this.fromColor(r, g, b);
            }
            if (this.lastImages.index != index) {
                this.lastImages.index = index;
                if (index) {
                    const line = this.lastImages.lines[this.lastImages.index - 1];
                    this._tooltip.innerHTML = `
                        <div class="s1"><span>Source (Block Tag)</span>: ${line.startTag}</div>
                        <div class="s2"><span>Output (Event)</span>: ${line.output}</div> 
                        <div class="s3"><span>Target (Block Tag)</span>: ${line.endTag}</div>
                        <div class="s4"><span>Input (Event)</span>: ${line.input}</div>
                        <div class="s5"><span>Event Actor</span>: ${this.actorMap[line.actor]}</div>
                    `
                } else {
                    this._tooltip.innerHTML = '';
                }
                this.renderLine();
            }
        }
        this.renderTooltip(event);
    }

    renderTooltip(event: MouseEvent) {
        if (this._tooltip) {
            if (this.lastImages && this.lastImages.index) {
                this._tooltip.style.display = 'block';
                this._tooltip.style.left = `${event.offsetX}px`;
                this._tooltip.style.top = `${event.offsetY}px`;
            } else {
                this._tooltip.style.display = 'none';
            }
        }
    }

    toColor(index: number) {
        let offset = index;
        const b = offset % 255;
        offset = Math.floor(offset / 255);
        const g = offset % 255;
        offset = Math.floor(offset / 255);
        const r = offset % 255;
        return { r, g, b };
    }

    fromColor(r: number, g: number, b: number) {
        return 65025 * r + 255 * g + b;
    }
}
