import {
    Component,
    OnInit,
    Inject,
    ViewChild,
    ElementRef,
    HostListener,
} from '@angular/core';
import { SchemaService } from 'src/app/services/schema.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-schema-tree',
    templateUrl: './schema-tree.component.html',
    styleUrls: ['./schema-tree.component.scss'],
})
export class SchemaTreeComponent implements OnInit {
    @ViewChild('canvas', { static: true })
    canvas: ElementRef<HTMLCanvasElement>;
    @ViewChild('content', { static: true })
    content: ElementRef<HTMLDivElement>;
    @ViewChild('main', { static: true })
    main: ElementRef<HTMLDivElement>;

    private _ctx!: CanvasRenderingContext2D;

    private _rectWidth: number = 150;
    private _rectWidthGap: number = 50;
    private _rectHeightGap: number = 50;
    private _lineWidth: number = 2.5;
    private _fontSize: number = 14;
    private _minRectHeight: number = 50;

    public loading = false;
    public isMoving: boolean = false;
    public header: string;
    public schema: { id: string; name: string }

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private schemaService: SchemaService
    ) {
        this.header = this.config.header || '';
        this.schema = this.config.data;
    }

    ngOnInit(): void {
        this._ctx = this.canvas.nativeElement.getContext('2d') as any;
        this.loading = true;
        this.schemaService
            .getSchemaTree(this.schema.id)
            .subscribe((result: any) => {
                const convertedTree = this.covertTree(result);
                this.drawSchemas(convertedTree);
                this.loading = false;
            });
    }

    public getHeader(): string {
        return this.schema?.name || this.header;
    }

    public onClose() {
        this.dialogRef.close(null);
    }

    private covertTree(root: { name: string; children: any[] }) {
        const stack: any = [
            {
                node: root,
                lvl: 1,
            },
        ];
        const result: any[][] = [[root]];
        while (stack.length > 0) {
            const arg = stack.shift();
            if (arg?.node?.children?.length > 0) {
                result[arg.lvl] = result[arg.lvl] || [];
                result[arg.lvl].push(
                    ...arg.node.children.map((child: any) =>
                        Object.assign(child, { parent: arg.node })
                    )
                );
                stack.push(
                    ...arg.node.children.map((node: any) => ({
                        node,
                        lvl: arg.lvl + 1,
                    }))
                );
            }
        }
        return result;
    }

    private splitSchemaName(name: string) {
        const result = [];
        while (name.length > 0) {
            result.push(name.substring(0, 20));
            name = name.slice(20);
        }
        return result;
    }

    private getOffset(count: number) {
        return (count * this._rectWidth + (count - 1) * this._rectWidthGap) / 2;
    }

    private maxHeightOnLvl(nodes: any[]) {
        const maxStringOnLvl = Math.max(
            ...nodes.map((item) => item.name.length, 0)
        );
        const countParts = Math.ceil(maxStringOnLvl / 20);
        const maxHeightOnLvl = countParts * this._fontSize + this._fontSize;
        return maxHeightOnLvl > this._minRectHeight
            ? maxHeightOnLvl
            : this._minRectHeight;
    }

    private setBackground(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        color: string = 'white'
    ) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }

    private drawSchemaLine(
        ctx: CanvasRenderingContext2D,
        parent: { x: number; y: number; color: string },
        current: { x: number; y: number }
    ) {
        ctx.strokeStyle = parent.color;
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
        ctx.closePath();
    }

    private drawSchema(
        ctx: any,
        schema: {
            name: string;
            x?: number;
            y?: number;
            color?: string;
            type: string;
        },
        offset: { x: number; y: number },
        height: number
    ) {
        ctx.beginPath();
        ctx.lineWidth = this._lineWidth;
        ctx.strokeStyle = this.stringToHex(schema.type);
        ctx.font = `500 ${this._fontSize}px Roboto, "Helvetica Neue", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'black';
        const splitTest = this.splitSchemaName(schema.name);
        for (let i = 0; i < splitTest.length; i++) {
            const text = splitTest[i];
            ctx.fillText(
                text,
                offset.x + this._rectWidth / 2,
                offset.y +
                height / 2 +
                (i - splitTest.length / 2) * this._fontSize
            );
        }

        ctx.roundRect(offset.x, offset.y, this._rectWidth, height, 10);
        ctx.stroke();
        ctx.closePath();

        schema.x = offset.x + this._rectWidth / 2;
        schema.y = offset.y + height;
        schema.color = ctx.strokeStyle as any;
    }

    private drawSchemas(flatTree: any[][]) {
        const maxCountOnLvl = Math.max(
            ...flatTree.map((item) => item.length, 0)
        );
        const rectHeights = flatTree.reduce(
            (sum, item) => (sum += this.maxHeightOnLvl(item)),
            0
        );
        this.canvas.nativeElement.height =
            2 * this._lineWidth +
            rectHeights +
            this._rectHeightGap * (flatTree.length - 1);
        this.canvas.nativeElement.width =
            2 * this._lineWidth +
            maxCountOnLvl * this._rectWidth +
            (maxCountOnLvl - 1) * this._rectWidthGap;

        this.canvas.nativeElement.width =
            this.main.nativeElement.offsetWidth >
                this.canvas.nativeElement.width
                ? this.main.nativeElement.offsetWidth
                : this.canvas.nativeElement.width;
        this.setBackground(
            this._ctx,
            this.canvas.nativeElement.width,
            this.canvas.nativeElement.height
        );
        let offsetY = this._lineWidth;
        for (let lvl = 0; lvl < flatTree.length; lvl++) {
            let offsetX =
                this.canvas.nativeElement.width / 2 -
                this.getOffset(flatTree[lvl].length);
            const maxHeightOnLvl = this.maxHeightOnLvl(flatTree[lvl]);
            for (const schema of flatTree[lvl]) {
                if (schema.parent) {
                    this.drawSchemaLine(this._ctx, schema.parent, {
                        x: offsetX + this._rectWidth / 2,
                        y: offsetY,
                    });
                }
                this.drawSchema(
                    this._ctx,
                    schema,
                    {
                        x: offsetX,
                        y: offsetY,
                    },
                    maxHeightOnLvl
                );
                offsetX += this._rectWidth + this._rectWidthGap;
            }
            offsetY += this._rectHeightGap + maxHeightOnLvl;
        }
    }

    private stringToHex(str: string): any {
        let hash = 0;
        str.split('').forEach((char) => {
            hash = char.charCodeAt(0) + ((hash << 5) - hash);
        });
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            color += value.toString(16).padStart(2, '0');
        }
        return color;
    }

    public download() {
        var image = this.canvas.nativeElement
            .toDataURL('image/png')
            .replace('image/png', 'image/octet-stream');
        var element = document.createElement('a');
        element.setAttribute('href', image);
        element.setAttribute('download', `${this.schema.name}.png`);
        element.click();
    }

    public startMove() {
        this.isMoving = true;
        document.body.classList.add('inherit-cursor');
        document.body.style.cursor = 'grabbing';
    }

    @HostListener('window:mouseup')
    stopMove() {
        this.isMoving = false;
        document.body.classList.remove('inherit-cursor');
        document.body.style.cursor = '';
    }

    @HostListener('window:mousemove', ['$event'])
    move(event: MouseEvent) {
        if (!this.isMoving) {
            return;
        }
        const scrollX = this.content.nativeElement.scrollLeft - event.movementX;
        const offsetY = this.content.nativeElement.scrollTop - event.movementY;
        if (scrollX >= 0 && scrollX < this.content.nativeElement.scrollWidth) {
            this.content.nativeElement.scrollLeft = scrollX;
        }

        if (offsetY >= 0 && offsetY < this.content.nativeElement.scrollHeight) {
            this.content.nativeElement.scrollTop = offsetY;
        }
    }
}
