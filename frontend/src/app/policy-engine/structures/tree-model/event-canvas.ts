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

        try {
            this.parent = parent;
            this.canvas = canvas;
            if (this.canvas) {
                this.context = this.canvas.getContext('2d');
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
            this.canvas.style.width = `${box.width}px`;
            this.canvas.style.height = `${box.height}px`;
            this.canvas.width = box.width;
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
        for (let index = 0; index < renderLine.length; index++) {
            const line = renderLine[index];
            line.index = index + 1;
            this.drawData(line);
        }
        const data = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        this.lastImage = {
            context: this.context,
            width: this.canvas.width,
            height: this.canvas.height,
            lines: renderLine,
            data: data
        };
    }

    public render() {
        if (!this.valid || !this.lastImage) {
            return;
        }
        this.lastImage.context.clearRect(0, 0, this.lastImage.width, this.lastImage.height);
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

    public getIndexObject(position: any): number {
        if (this.valid && this.lastImage && position) {
            const idx = (position.y * this.lastImage.width + position.x) * 4;
            const a = this.lastImage.data[idx + 3];
            let index = 0;
            if (a == 255) {
                const r = this.lastImage.data[idx];
                const g = this.lastImage.data[idx + 1];
                const b = this.lastImage.data[idx + 2];
                index = this.fromColor(r, g, b);
            }
            return index;
        } else {
            return -1;
        }
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
}
