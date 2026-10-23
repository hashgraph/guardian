import {
    Component,
    Input,
    OnChanges,
} from '@angular/core';
import {
    FormulasTree,
    FormulaItem,
    FormulaItemLink,
    SchemaItem,
} from '../../../models/formula-tree';
import {TreeGraphComponent} from 'src/app/modules/common/tree-graph/tree-graph.component';
import {TreeNode} from 'src/app/modules/common/tree-graph/tree-node';
import {TreeSource} from 'src/app/modules/common/tree-graph/tree-source';
import {fitToContainer, initialView} from 'src/app/modules/common/tree-graph/tree-zoom';

const ZOOM_STEP = 1.25;
const FIT_PADDING = 24;
const INITIAL_MIN_ZOOM = 0.6;

type ValueStatus = 'Missing' | 'Default' | 'Suggested' | 'Not null';

interface GraphNodeData {
    title: string;
    payload: FormulaItem | SchemaItem | any;
    valueStatus: ValueStatus | null;
}

interface LinkRow {
    schema: string | null;
    parents: string[];
    path: string | null;
    description: string | null;
    value: any;
    type: string | null;
    status: ValueStatus | null;
    hasValue: boolean;
    jsonExpanded: boolean;
    technical: boolean;
}

class GraphNode extends TreeNode<GraphNodeData> {
    constructor(
        id: string,
        type: 'root' | 'sub',
        data: GraphNodeData,
    ) {
        super(id, type, data);
    }
}

@Component({
    selector: 'formulas-graph-tab',
    templateUrl: './formulas-graph-tab.component.html',
    styleUrls: ['./formulas-graph-tab.component.scss'],
    standalone: false
})
export class FormulasGraphTabComponent implements OnChanges {
    @Input()
    public items: FormulaItem[] = [];

    public source: TreeSource<GraphNode> | null = null;
    private treeGraph: TreeGraphComponent | null = null;
    public selectedNode: GraphNode | null = null;
    public title: string | null = null
    public linkRows: LinkRow[] = [];
    public itemType: string | null = null;
    public itemValue: any = null;
    public nodeDescription: string | null = null;

    public ngOnChanges(): void {
        this.source = this.buildGraph(this.items);

        if (this.treeGraph && this.source) {
            this.treeGraph.setData(this.source);
            this.scheduleFit();
        }
    }

    public get zoom(): number {
        return this.treeGraph ? Math.round(this.treeGraph.zoom * 100) : 100;
    }

    public onZoomIn(): void {
        this.zoomByStep(ZOOM_STEP);
    }

    public onZoomOut(): void {
        this.zoomByStep(1 / ZOOM_STEP);
    }

    public onFit(): void {
        this.fit(false);
    }

    private zoomByStep(factor: number): void {
        const container = this.treeGraph?.movedEl?.nativeElement;
        if (!this.treeGraph || !container) {
            return;
        }
        const rect = container.getBoundingClientRect();
        this.treeGraph.zoomAt(this.treeGraph.zoom * factor, rect.width / 2, rect.height / 2);
    }

    private scheduleFit(attempt: number = 0): void {
        setTimeout(() => {
            if (!this.fit(true) && attempt < 20) {
                this.scheduleFit(attempt + 1);
            }
        }, attempt === 0 ? 0 : 50);
    }

    private fit(initial: boolean): boolean {
        const graph = this.treeGraph;
        const container = graph?.movedEl?.nativeElement;
        const grid = graph?.gridEl?.nativeElement.querySelector('.tree-grid') as HTMLElement | null;
        if (!graph || !container || !grid) {
            return false;
        }
        const rect = container.getBoundingClientRect();
        // offset sizes are unscaled, so the result does not depend on the current zoom
        const rootEl = initial ? grid.querySelector('.tree-node') as HTMLElement | null : null;
        let view;
        if (rootEl) {
            // root node centre/top in unscaled grid coordinates (offsets ignore the CSS scale)
            let left = 0;
            let top = 0;
            for (let el: HTMLElement | null = rootEl; el && el !== grid; el = el.offsetParent as HTMLElement | null) {
                left += el.offsetLeft;
                top += el.offsetTop;
            }
            view = initialView(
                rect.width,
                rect.height,
                grid.offsetWidth,
                grid.offsetHeight,
                left + rootEl.offsetWidth / 2,
                top,
                FIT_PADDING,
                INITIAL_MIN_ZOOM
            );
        } else {
            view = fitToContainer(rect.width, rect.height, grid.offsetWidth, grid.offsetHeight, FIT_PADDING);
        }
        if (!view) {
            return false;
        }
        graph.setView(view.zoom, view.x, view.y);
        return true;
    }

    private buildTitle(node: any): string {
        const {type, name} = node;

        if (type && name) {
            return `${type}: ${name}`;
        }

        return name || type;
    }

    private buildGraph(items: FormulaItem[]): TreeSource<GraphNode> | null {
        if (!items?.length) {
            return null;
        }

        const navigationTree = FormulasTree.createNav(items);
        const graphNodes: GraphNode[] = [];

        const walk = (node: Record<string, any>, parent: GraphNode | null): void => {
            const isComponent = String(node.view || '').toLowerCase() === 'component';
            let currentParent = parent;

            if (isComponent) {
                const id = node.id;
                const type = parent ? 'sub' : 'root';
                const data: GraphNodeData = {
                    title: this.buildTitle(node),
                    payload: node.data,
                    valueStatus: null,
                };

                const gNode = new TreeNode<GraphNodeData>(id, type, data);
                graphNodes.push(gNode);
                parent?.addId(gNode.id);
                currentParent = gNode;
            }

            for (const child of node.children ?? []) {
                walk(child, currentParent);
            }
        };

        walk(navigationTree, null);

        return graphNodes.length ? new TreeSource<GraphNode>(graphNodes) : null;
    }

    public initGraph(treeGraphComponent: TreeGraphComponent): void {
        this.treeGraph = treeGraphComponent;

        if (this.source) {
            this.treeGraph.setData(this.source);
            this.scheduleFit();
        }
    }

    public onRender(): void {
        return;
    }

    private parseJSON(value: any): any {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);

                if (Array.isArray(parsed)) {
                    return 'array';
                }
                return typeof parsed;
            } catch {
                return typeof value;
            }
        }

        return typeof value;
    }

    private buildSchemaNamesChain(schema: any, path: string): string[] {
        const names: string[] = [];
        let node = schema;
        const parts = path.split('.');

        for (const key of parts) {
            if (!node) {
                break;
            }

            if (Array.isArray(node.fields)) {
                names.push(node.description || node.name);

                node = node.fields.find((f: any) => f.name === key);
            } else {
                break;
            }
        }

        return names;
    }

    private isEmptyValue(value: any): boolean {
        if (value === null || value === undefined) {
            return true;
        }

        if (typeof value === 'string') {
            return value.trim().length === 0;
        }

        if (Array.isArray(value)) {
            return value.length === 0;
        }

        if (typeof value === 'object') {
            return Object.keys(value).length === 0;
        }

        return false;
    }

    private valuesEqual(first: any, second: any): boolean {
        return JSON.stringify(first) === JSON.stringify(second);
    }

    private calcValueStatus(
        value: any,
        schemaDefault: any,
        schemaSuggested: any
    ): ValueStatus {
        if (this.isEmptyValue(value)) {
            return 'Missing';
        }

        if (this.valuesEqual(value, schemaDefault)) {
            return 'Default';
        }

        if (this.valuesEqual(value, schemaSuggested)) {
            return 'Suggested';
        }

        return 'Not null';
    }

    public clearSelection(): void {
        this.selectedNode = null;
        this.title = null;
        this.linkRows = [];
        this.itemType = null;
        this.itemValue = null;
        this.nodeDescription = null
    }

    public onSelect(node: TreeNode<GraphNodeData> | null): void {
        if (!node) {
            this.clearSelection();
            return;
        }

        this.clearSelection();

        this.selectedNode = node;
        this.title = node.data.title;

        const payload = node.data.payload;
        this.itemType = payload.type ?? null;
        this.itemValue = payload.value ?? (payload as any)._value ?? null;
        this.nodeDescription = payload.description ?? null;

        this.linkRows = this.buildLinkRows(payload);
    }

    private buildLinkRows(payload: any): LinkRow[] {
        const links: FormulaItemLink[] = payload?.links ?? [];
        return links.map((link) => {
            const linkItem: any = link.linkItem;
            if (!linkItem?._field) {
                return {
                    schema: link.linkEntityName ?? null,
                    parents: [],
                    path: link.linkItemName ?? null,
                    description: null,
                    value: null,
                    type: null,
                    status: null,
                    hasValue: false,
                    jsonExpanded: false,
                    technical: false
                };
            }
            const chain = this.buildSchemaNamesChain(linkItem._schema, linkItem._path);
            const schema = chain.pop() ?? null;
            return {
                schema,
                parents: chain,
                path: linkItem._path ?? null,
                description: linkItem._field.description ?? null,
                value: linkItem.value,
                type: this.parseJSON(linkItem.value),
                status: this.calcValueStatus(linkItem.value, linkItem._field.default, linkItem._field.suggest),
                hasValue: linkItem.value !== undefined,
                jsonExpanded: false,
                technical: false
            };
        });
    }

    public statusClass(status: ValueStatus | null): string {
        switch (status) {
            case 'Missing':
                return 'status-missing';
            case 'Default':
                return 'status-default';
            case 'Suggested':
                return 'status-as-suggested';
            case 'Not null':
                return 'status-notNull';
            default:
                return 'status-none';
        }
    }

    public getNodeStatusClass(rawNode: GraphNode): string {
        const payload = rawNode.data.payload;
        const itemType = payload.type;

        if (itemType === 'constant') {
            return 'status-none';
        }

        const rows = this.buildLinkRows(payload);
        const row = rows.find((e) => e.hasValue) ?? rows.find((e) => e.status);
        return this.statusClass(row?.status ?? null);
    }

    public formatValueForJson(value: any): any {
        if (typeof value !== 'string') {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
}
