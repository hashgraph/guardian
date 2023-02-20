import { BlockRect } from './block-rect';


export class BlocLine {
    public readonly default: boolean;
    public readonly short: boolean;
    public readonly height: number;
    public readonly start: BlockRect;
    public readonly end: BlockRect;
    public readonly color: number[];
    public readonly direction: boolean;
    public readonly minOffset: number;

    public index: number;
    public dash: boolean;
    public points!: number[];
    public startTag!: string;
    public endTag!: string;
    public actor!: string;
    public input!: string;
    public output!: string;

    public selectedStart: boolean;
    public selectedEnd: boolean;
    public selected: boolean;

    constructor(start: BlockRect, end: BlockRect, defaultLine: boolean = false) {
        this.default = defaultLine;
        this.start = start;
        this.end = end;
        this.index = 0;
        this.dash = false;
        this.color = [136, 136, 136];
        this.selectedStart = false;
        this.selectedEnd = false;
        this.selected = false;
        this.height = Math.abs(start.top.y - end.top.y);
        this.short = this.height < 90;
        this.direction = start.top.y < end.top.y;
        this.minOffset = Math.max(start.right.x, end.right.x) + 20;
    }

    public calc(offset: number): void {
        if (this.default && this.short) {
            if (this.direction) {
                this.points = [
                    this.start.bottom.x, this.start.bottom.y,
                    this.end.top.x, this.end.top.y
                ];
            } else {
                this.points = [
                    this.start.top.x, this.start.top.y,
                    this.end.bottom.x, this.end.bottom.y
                ];
            }
        } else {
            if (!offset) {
                offset = this.minOffset;
            }
            const yOffset = 6;
            this.points = [
                this.start.right.x, this.start.right.y + yOffset,
                offset, this.start.right.y + yOffset,
                offset, this.end.right.y - yOffset,
                this.end.right.x, this.end.right.y - yOffset
            ];
        }
    }

    public setColor(r: number, g: number, b: number): void {
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
    }

    public selectBlock(tag: string | undefined) {
        this.selectedStart = this.startTag == tag;
        this.selectedEnd = this.endTag == tag;
        this.selected = this.selectedStart || this.selectedEnd;
        if (this.selectedStart) {
            this.setColor(225, 0, 0);
        } else if (this.selectedEnd) {
            this.setColor(0, 128, 0);
        } else if (this.dash) {
            this.setColor(175, 175, 175);
        } else {
            this.setColor(110, 110, 110);
        }
    }
}
