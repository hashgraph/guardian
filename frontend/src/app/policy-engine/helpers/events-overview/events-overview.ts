import { Component, ElementRef, EventEmitter, Injectable, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { RegisteredBlocks } from '../../registered-blocks';
import { TreeFlatOverview } from '../tree-flat-overview/tree-flat-overview';

@Component({
    selector: 'events-overview',
    templateUrl: 'events-overview.html',
    styleUrls: ['events-overview.css']
})
export class EventsOverview {
    @Input('blocks') blocks!: any[];
    @Input('all-blocks') allBlocks!: any[];
    @Input('all-events') allEvents!: any[];
    @Input('active') active!: boolean;
    @Input('selected') selected!: any;
    @Input('context') context!: any;

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    _parent!: Element;
    _canvas!: HTMLCanvasElement;
    _context!: CanvasRenderingContext2D | null;

    blockMap: any;

    constructor(
        private element: ElementRef,
        private registeredBlocks: RegisteredBlocks) {
    }

    ngOnChanges(changes: SimpleChanges) {
        if(changes.context) {
            this.setContext(this.context);
        }
        if(changes.active) {
            if(this.active) {
                this.render()
            } else {
                this.refreshCanvas();
            }
        }
    }

    ngAfterViewInit(): void {
        this._canvas = this.canvasRef?.nativeElement;
        this._context = this._canvas?.getContext('2d');
        this.refreshCanvas();
    }

    private setContext(context: TreeFlatOverview) {
        if (context && context.context) {
            this._parent = context.context.nativeElement;
            context.change.subscribe((e) => {
                setTimeout(() => {
                    this.render();
                }, 100);
            })
        }
    }

    public render(): void {
        if(!this.active) {
            return;
        }

        const boxCanvas = this.refreshCanvas();

        const map = this.getBlockSize(this.blocks, boxCanvas);

        const lines = this.getLines(map, this.allBlocks, this.allEvents);

        const renderLine = this.sortLine(lines);

        for (const line of renderLine) {
            this.drawArrow(line);
        }
    }

    private refreshCanvas() {
        if (this._canvas && this._parent) {
            this._canvas.setAttribute('id', 'tree-canvas');
            this._canvas.style.position = 'absolute';
            this._canvas.style.top = '0px';
            this._canvas.style.left = '0px';
            this._canvas.style.pointerEvents = 'none';
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

    private getBlock(blocks: any[], blockMap: any) {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const next = blocks[i + 1];
            const prev = blocks[i - 1];
            const item = {
                tag: block.tag,
                events: block.events,
                next: next?.tag,
                prev: prev?.tag,
            }
            blockMap[item.tag] = item;
            if (block.children) {
                this.getBlock(block.children, blockMap);
            }
        }
        return blockMap;
    }

    private getBlockSize(blocks: any[], boxCanvas: any) {
        const blockMap = this.getBlock(blocks, {});

        const tags = Object.keys(blockMap);
        for (const tag of tags) {
            const div = document.querySelector(`*[block-instance="${tag}"]`);
            if (div) {
                blockMap[tag].div = div;
                const box = div.getBoundingClientRect();
                blockMap[tag].leftOffset = boxCanvas.left;
                blockMap[tag].topOffset = boxCanvas.top;
                blockMap[tag].left = box.left || 0;
                blockMap[tag].right = box.right || 0;
                blockMap[tag].top = box.top || 0;
                blockMap[tag].bottom = box.bottom || 0;
                blockMap[tag].width = box.width || 0;
                blockMap[tag].height = box.height || 0;
            }
        }

        return blockMap;
    }

    private getLines(blockMap: any, allBlocks: any[], allEvents: any[]) {
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
                if (!item.stopPropagation && about.defaultEvent) {
                    const line = this.createLine(blockMap, item.tag, block.next);
                    if (line) {
                        line.default = true;
                        line.widthOffset = minWidthOffset;
                        lines.push(line);
                    }
                }
            }
        }
        if (allEvents) {
            for (const item of allEvents) {
                if (!item.disabled) {
                    const line = this.createLine(blockMap, item.source?.tag, item.target?.tag);
                    if (line) {
                        line.widthOffset = minWidthOffset;
                        lines.push(line);
                    }
                }
            }
        }
        return lines;
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
            start_top_x: start.left + (minWidth / 2) - start.leftOffset,
            start_top_y: start.top - start.topOffset - 6,
            start_bottom_x: start.left + (minWidth / 2) - start.leftOffset,
            start_bottom_y: start.top + start.height - start.topOffset + 2,
            start_right_x: start.right - start.leftOffset + 32,
            start_right_y: start.top - start.topOffset + 16 + 6,

            end_top_x: end.left + (minWidth / 2) - start.leftOffset,
            end_top_y: end.top - start.topOffset - 6,
            end_bottom_x: end.left + (minWidth / 2) - start.leftOffset,
            end_bottom_y: end.top + end.height - start.topOffset + 2,
            end_right_x: end.right - start.leftOffset + 32,
            end_right_y: end.top - start.topOffset + 16 - 6,

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
            color: '#888',
            points: null
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
                line.color = 'red';
            } else if (line.selectedE) {
                line.color = 'green';
            } else {
                line.color = '#888';
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
                line.widthOffset = line.widthOffset + 5;
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

    private drawArrow(line: any) {
        if (!this._context) {
            return;
        }

        const ctx = this._context;
        const points = line.points;

        ctx.save();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.selected ? 3 : 1;
        ctx.beginPath();

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
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - headlen * Math.cos(angle - k), ty - headlen * Math.sin(angle - k));
        ctx.lineTo(tx - headlen * Math.cos(angle + k), ty - headlen * Math.sin(angle + k));
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx - headlen * Math.cos(angle - k), ty - headlen * Math.sin(angle - k));
        ctx.stroke();
        ctx.restore();
    }
}
