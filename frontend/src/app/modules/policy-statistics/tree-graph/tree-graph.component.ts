import { Component, ContentChild, ElementRef, EventEmitter, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { SelectType } from './tree-types';
import { TreeNode } from './tree-node';
import { Grid } from './tree-grid';

@Component({
    selector: 'app-tree-graph',
    templateUrl: './tree-graph.component.html',
    styleUrls: ['./tree-graph.component.scss'],
})
export class TreeGraphComponent implements OnInit {
    @ViewChild('gridEl', { static: false }) gridEl: ElementRef;
    @ContentChild('nodeTemplate') nodeTemplate: TemplateRef<any>;

    @Output('init') initEvent = new EventEmitter<TreeGraphComponent>();
    @Output('select') selectEvent = new EventEmitter<TreeNode<any> | null>();
    @Output('render') renderEvent = new EventEmitter<any>();

    public roots: TreeNode<any>[];
    public nodes: TreeNode<any>[];
    public grid: Grid;
    public width: number = 200;
    public zoom = 1;
    public toolbar = true;

    constructor() {

    }

    ngOnInit() {
        this.initEvent.emit(this);
    }

    ngOnDestroy(): void {

    }

    public get moving(): boolean {
        if (this.grid) {
            return this.grid.moving;
        } else {
            return false;
        }
    }

    public setData(nodes: TreeNode<any>[]) {
        const { roots, allNodes } = this.nonUniqueNodes(nodes);
        this.roots = roots;
        this.nodes = allNodes;
        this.grid = Grid.createLayout(this.width, this.roots);
        this.grid.render();
        this.renderEvent.emit({
            grid: this.grid,
            roots: this.roots,
            nodes: this.nodes
        })
    }

    public getNodes(): TreeNode<any>[] {
        return this.nodes;
    }

    public getRoots(): TreeNode<any>[] {
        return this.roots;
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
        }
    }

    private uniqueNodes(nodes: TreeNode<any>[]): TreeNode<any>[] {
        const nodeMap = new Map<string, TreeNode<any>>();
        for (const node of nodes) {
            nodeMap.set(node.id, node);
        }

        const roots = nodes.filter((n) => n.type === 'root');
        const subs = nodes.filter((n) => n.type !== 'root');

        return roots;
    }

    private nonUniqueNodes(nodes: TreeNode<any>[]) {
        const roots = nodes.filter((n) => n.type === 'root');
        const subs = nodes.filter((n) => n.type !== 'root');

        const nodeMap = new Map<string, TreeNode<any>>();
        for (const node of subs) {
            nodeMap.set(node.id, node);
        }

        const allNodes: TreeNode<any>[] = [];
        const getSubNode = (node: TreeNode<any>): TreeNode<any> => {
            allNodes.push(node);
            for (const id of node.childIds) {
                const child = nodeMap.get(id);
                if (child) {
                    node.addNode(getSubNode(child.clone()));
                } else {
                    console.log('', id)
                }
            }
            return node;
        }
        for (const root of roots) {
            getSubNode(root);
        }
        for (const root of roots) {
            root.resize();
        }
        for (const node of allNodes) {
            node.update();
        }
        return { roots, allNodes };
    }

    public setZoom(zoom: number, el: any) {
        let transformOrigin = [0, 0];
        var p = ["webkit", "moz", "ms", "o"],
            s = "scale(" + zoom + ")",
            oString = (transformOrigin[0] * 100) + "% " + (transformOrigin[1] * 100) + "%";

        for (var i = 0; i < p.length; i++) {
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

    public onScroll($event: any) {
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
            $event.stopPropagation()
        }
        this.grid.onMove(true, $event);
        this.gridEl.nativeElement.style.left = `${this.grid.x}px`;
        this.gridEl.nativeElement.style.top = `${this.grid.y}px`;
    }

    public onMouseUp($event: any) {
        if ($event.stopPropagation) {
            $event.stopPropagation()
        }
        this.grid.onMove(false, $event);
        this.gridEl.nativeElement.style.left = `${this.grid.x}px`;
        this.gridEl.nativeElement.style.top = `${this.grid.y}px`;
    }

    public onMouseMove($event: any) {
        if ($event.stopPropagation) {
            $event.stopPropagation()
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
