import {
    Component, ContentChild, ElementRef, EventEmitter,
    Input, NgZone, OnInit, Output, Renderer2, TemplateRef, ViewChild
} from '@angular/core';
import { SelectType } from './tree-types';
import { TreeNode } from './tree-node';
import { Grid } from './tree-grid';
import { TreeSource } from './tree-source';
import { clampZoom, wheelFactor, zoomAtPoint } from './tree-zoom';

@Component({
    selector: 'app-tree-graph',
    templateUrl: './tree-graph.component.html',
    styleUrls: ['./tree-graph.component.scss'],
    standalone: false
})
export class TreeGraphComponent implements OnInit {
    @ViewChild('movedEl', { static: true }) movedEl: ElementRef<HTMLDivElement>;
    @ViewChild('gridEl', { static: false }) gridEl: ElementRef<HTMLDivElement>;
    @ContentChild('nodeTemplate') nodeTemplate: TemplateRef<any>;

    @Output('init') initEvent = new EventEmitter<TreeGraphComponent>();
    @Output('select') selectEvent = new EventEmitter<TreeNode<any> | null>();
    @Output('render') renderEvent = new EventEmitter<any>();

    public grid: Grid;

    @Input()
    public width: number = 200;
    /**
     * 'origin' - legacy wheel zoom around the top-left corner,
     * 'cursor' - zoom anchored at the cursor position (proportional to wheel delta, supports pinch).
     */
    @Input()
    public wheelZoom: 'origin' | 'cursor' = 'origin';
    public zoom = 1;
    public toolbar = true;
    public source: TreeSource<any>;

    private _unListen: Function;

    constructor(
        private ngZone: NgZone,
        private renderer: Renderer2
    ) {

    }

    ngOnInit() {
        this.ngZone.runOutsideAngular(() => {
            this._unListen = this.renderer.listen(
                this.movedEl.nativeElement,
                'mousemove',
                this.onMouseMove.bind(this)
            );
        });
        this.initEvent.emit(this);
    }

    ngOnDestroy(): void {
        this._unListen();
    }

    public get moving(): boolean {
        if (this.grid) {
            return this.grid.moving;
        } else {
            return false;
        }
    }

    public setData(source: TreeSource<any>) {
        this.source = source;
        this.grid = Grid.createLayout(this.width, this.source.roots);
        this.grid.render();
        this.renderEvent.emit({
            grid: this.grid,
            roots: this.source.roots,
            nodes: this.source.nodes,
            source: this.source
        });
    }

    public select(node: TreeNode<any> | null) {
        const selected = node && node.selected !== SelectType.SELECTED;
        if (node && selected) {
            for (const node of this.grid.nodes) {
                node.selected = SelectType.HIDDEN;
            }
            node.select(SelectType.SELECTED);
        } else {
            for (const node of this.grid.nodes) {
                node.selected = SelectType.NONE;
            }
        }
        for (const node of this.grid.nodes) {
            for (const line of node.lines) {
                line.select();
            }
            if (node.linkLine) {
                node.linkLine.select();
            }
        }
    }

    public setZoom(zoom: number, el: any) {
        const transformOrigin = [0, 0];
        const p = ["webkit", "moz", "ms", "o"];
        const s = "translateZ(0) scale(" + zoom + ")";
        const oString = (transformOrigin[0] * 100) + "% " + (transformOrigin[1] * 100) + "%";
        for (let i = 0; i < p.length; i++) {
            el.style[p[i] + "Transform"] = s;
            el.style[p[i] + "TransformOrigin"] = oString;
        }
        el.style["transform"] = s;
        el.style["transformOrigin"] = oString;
    }

    public onZoom(zoom: number) {
        if (zoom === 0) {
            this.zoom = 1;
        } else if (zoom > 0) {
            this.zoom += 0.1;
        } else {
            this.zoom -= 0.1;
        }
        this.zoom = Math.max(this.zoom, 0.1);
        this.setZoom(this.zoom, this.gridEl.nativeElement);
    }

    /**
     * Zoom keeping the container point (px, py) fixed on screen.
     * Dragging stays 1:1 because grid.x/y are left/top offsets (not scaled) and transform-origin is 0 0.
     */
    public zoomAt(newZoom: number, px: number, py: number): void {
        if (!this.grid || !this.gridEl) {
            return;
        }
        const view = zoomAtPoint({ zoom: this.zoom, x: this.grid.x, y: this.grid.y }, newZoom, px, py);
        this.zoom = view.zoom;
        this.setZoom(this.zoom, this.gridEl.nativeElement);
        this.move(view.x, view.y);
    }

    public setView(zoom: number, x: number, y: number): void {
        if (!this.grid || !this.gridEl) {
            return;
        }
        this.zoom = clampZoom(zoom);
        this.setZoom(this.zoom, this.gridEl.nativeElement);
        this.move(x, y);
    }

    private onCursorWheel($event: WheelEvent) {
        $event.preventDefault();
        if (!this.grid || !this.gridEl) {
            return;
        }
        const rect = this.movedEl.nativeElement.getBoundingClientRect();
        this.zoomAt(
            this.zoom * wheelFactor($event.deltaY, $event.deltaMode),
            $event.clientX - rect.left,
            $event.clientY - rect.top
        );
    }

    public onScroll($event: any) {
        if (this.wheelZoom === 'cursor') {
            this.onCursorWheel($event);
            return;
        }
        if ($event.deltaY < 0) {
            this.zoom = this.zoom * 1.1;
        } else {
            this.zoom = this.zoom * 0.9;
        }
        this.zoom = Math.max(this.zoom, 0.1);
        this.setZoom(this.zoom, this.gridEl.nativeElement);
    }

    public onMouseDown($event: any) {
        if ($event.stopPropagation) {
            $event.stopPropagation();
        }
        this.grid.onMove(true, $event);
        this.gridEl.nativeElement.style.left = `${this.grid.x}px`;
        this.gridEl.nativeElement.style.top = `${this.grid.y}px`;
    }

    public onMouseUp($event: any) {
        if ($event.stopPropagation) {
            $event.stopPropagation();
        }
        this.grid.onMove(false, $event);
        this.gridEl.nativeElement.style.left = `${this.grid.x}px`;
        this.gridEl.nativeElement.style.top = `${this.grid.y}px`;
    }

    public onMouseMove($event: any) {
        if ($event.stopPropagation) {
            $event.stopPropagation();
        }
        if (this.grid.onMoving($event)) {
            this.gridEl.nativeElement.style.left = `${this.grid.x}px`;
            this.gridEl.nativeElement.style.top = `${this.grid.y}px`;
        }
    }

    public onSelectNode(node: TreeNode<any> | null) {
        this.select(node);
        if (node && node.selected === SelectType.SELECTED) {
            this.selectEvent.emit(node);
        } else {
            this.selectEvent.emit(null);
        }
    }

    public move(x: number, y: number): void {
        if (this.grid) {
            this.grid.move(x, y);
        }
        this.refresh();
    }

    public refresh() {
        if (this.gridEl) {
            this.gridEl.nativeElement.style.left = `${this.grid.x}px`;
            this.gridEl.nativeElement.style.top = `${this.grid.y}px`;
        }
    }
}
