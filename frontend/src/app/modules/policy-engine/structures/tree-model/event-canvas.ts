import { BlocLine } from "./event-line";

export class EventCanvas {
    public readonly valid: boolean;

    private container: HTMLElement;
    private parent: any;
    private canvas: any;
    private context: any;
    private box: any;
    private lastImage: any;
    private top: any;
    private left: any;
    private width: any;
    private maxWidth: any;

    constructor(
        container: HTMLElement,
        parent?: HTMLCanvasElement,
        canvas?: HTMLCanvasElement
    ) {
        this.valid = false;
        if (container.parentElement) {
            this.container = container.parentElement;
        } else {
            this.container = container;
        }
        const box = this.container.getBoundingClientRect();
        this.top = box.top;
        this.left = box.left;
        this.width = box.width;
        this.maxWidth = box.width;

        try {
            this.parent = parent;
            this.canvas = canvas;
            if (this.canvas) {
                this.context = this.canvas.getContext(
                    '2d',
                    {
                        willReadFrequently: true
                    }
                );
                if (this.context) {
                    this.valid = true;
                }
            }
        } catch (error) {
            this.valid = false;
        }
    }

    public clear(): void {
        if (this.valid) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    public resize(): DOMRect | undefined {
        if (this.valid) {
            this.canvas.setAttribute('id', 'tree-canvas');
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '0px';
            this.canvas.style.left = '0px';
            const box = this.parent.getBoundingClientRect();
            const width = Math.max(box.width, this.maxWidth);
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${box.height}px`;
            this.canvas.width = width;
            this.canvas.height = box.height;
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.box = this.canvas.getBoundingClientRect();
            return this.box;
        }
        return undefined;
    }

    public getRect(): DOMRect | undefined {
        return this.box;
    }

    public setData(renderLine: BlocLine[]) {
        if (!this.valid) {
            return;
        }

        if (this.lastImage?.data) {
            (this.lastImage as any).data = null;
        }

        this.maxWidth = 0;
        for (let i = 0; i < renderLine.length; i++) {
            const line = renderLine[i];
            this.maxWidth = Math.max(this.maxWidth, line.width);
            line.index = i + 1;
            this.drawData(line);
        }

        const box = this.parent.getBoundingClientRect();
        const width = Math.max(box.width, this.maxWidth);
        this.canvas.style.width = `${width}px`;
        this.canvas.width = width;

        this.lastImage = {
            context: this.context,
            width: this.canvas.width,
            height: this.canvas.height,
            lines: renderLine,
            data: null
        };
    }

    public render() {
        if (!this.valid || !this.lastImage) {
            return;
        }
        this.lastImage.context.clearRect(0, 0, this.lastImage.width, this.lastImage.height);
        this.maxWidth = this.width;
        for (const line of this.lastImage.lines) {
            const selected = this.lastImage.index == line.index;
            this.drawArrow(line, line.dash, selected);
        }
    }

    private toColor(index: number): any {
        let offset = index;
        const b = offset % 255;
        offset = Math.floor(offset / 255);
        const g = offset % 255;
        offset = Math.floor(offset / 255);
        const r = offset % 255;
        return { r, g, b };
    }

    private fromColor(r: number, g: number, b: number): number {
        return 65025 * r + 255 * g + b;
    }

    private drawData(line: BlocLine): void {
        const ctx = this.context;
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

    private drawArrow(line: BlocLine, dash: boolean = false, selected: boolean = false): void {
        const ctx = this.context;
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

    public getPosition(event: MouseEvent): any {
        return {
            x: event.clientX - this.left,
            y: event.clientY - this.top + this.container.scrollTop
        }
    }

    public clampPosition(position: any): any {
        if (position.x > this.width - 175) {
            position.x = this.width - 175;
        }
        return position;
    }

    public getIndexObject(position: { x: number; y: number }): number {
        if (!this.valid || !this.lastImage || !position) {
            return -1;
        }

        for (let i = this.lastImage.lines.length - 1; i >= 0; i--) {
            const line   = this.lastImage.lines[i];
            const pts    = line.points;

            this.context.save();
            this.context.lineWidth = 8;
            this.context.setLineDash([]);
            this.context.beginPath();

            for (let p = 0; p < pts.length - 3; p += 2) {
                this.context.moveTo(pts[p],     pts[p + 1]);
                this.context.lineTo(pts[p + 2], pts[p + 3]);
            }

            const hit = this.context.isPointInStroke(position.x, position.y);
            this.context.restore();

            if (hit) {
                return line.index;
            }
        }
        return -1;
    }

    public getLineByIndex(index: number): BlocLine | undefined {
        return this.lastImage.lines[index - 1];
    }

    public selectLine(index: number): BlocLine | undefined {
        if (!this.valid || !this.lastImage) {
            return;
        }
        if (this.lastImage.index != index) {
            this.lastImage.index = index;
            this.render();
        }
        return this.lastImage.lines[index - 1];
    }

    destroy(): void {
        if (!this.valid || !this.canvas) { return; }

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = this.canvas.height = 0;

        if(this.lastImage) {
            (this.lastImage as any).data = null;
            this.lastImage = null as any;
        }

        this.canvas.remove();

        (this as any).context   = null;
        (this as any).canvas    = null;
        (this as any).parent    = null;
        (this as any).container = null;
    }
}
