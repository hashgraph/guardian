import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IResultContext } from '../interfaces/result-context.interface';
import { ITreeContext } from '../interfaces/tree-context.interface';
import { ITableColumns } from '../interfaces/table-columns.interface';
import { ITreeItemContext } from '../interfaces/tree-item-context.interface';
import BlockIcons from '../../policy-engine/services/block-icons';

interface IToolInfoContext {
    id: string;
    name: string;
    description: string;
    hash: string;
    messageId: string;
}

interface IToolPropContext {
    type: string;
    total_rate: string;
    contexts: IResultContext<IToolDetailsContext>[];
}

interface IToolDetailsContext {
    index: number,
    properties: IPropertiesContext[]
}

interface IBlockContext {
    blockIndex: string;
    blockType: string;
    blockTag: string;
    blockIcon: string;
    blockName: string;
    indexRate: any;
}

interface IBlockDetailsContext {
    index: number,
    type: string;
    blockType: string;
    permissionRate: string;
    propRate: string;
    eventRate: string;
    artifactsRate: string;
    totalRate: string;
    properties: IPropertiesContext[],
    permissions: IPermissionsContext[],
    events: IEventsContext[],
    artifacts: IArtifactsContext[]
}

interface IBlockPropContext {
    fantom: boolean;
    type: string;
    item?: any;
    value?: any;
}

interface IPropertiesContext extends IBlockPropContext {
    lvl?: any;
    offset?: any;
    name?: any;
    propType?: any;
}

interface IPermissionsContext extends IBlockPropContext {
    name?: any;
}

interface IEventsContext extends IBlockPropContext {
    source?: any;
    output?: any;
    target?: any;
    input?: any;
    actor?: any;
    disabled?: any;
}

interface IArtifactsContext extends IBlockPropContext {
    fileName?: any;
    fileExtension?: any;
    fileType?: any;
    fileHash?: any;
}

@Component({
    selector: 'app-compare-tool',
    templateUrl: './compare-tool.component.html',
    styleUrls: ['./compare-tool.component.scss']
})
export class CompareToolComponent implements OnInit {
    @Input('value') value!: any;
    @Input() type: string = 'tree';
    @Input() eventsLvl: string = '1';
    @Input() propLvl: string = '2';
    @Input() childrenLvl: string = '2';
    @Input() idLvl: string = '1';

    @Output() change = new EventEmitter<any>();

    public readonly icons: any = Object.assign({}, BlockIcons);

    public minWidth: number;
    public headers: any[];

    public size: number;
    public totals: number[];
    public resultContext: IResultContext<IToolInfoContext>[] | null;
    public blocks: ITreeContext<IBlockContext, IBlockDetailsContext>[] | null;
    public inputEvents: IToolPropContext[] | null;
    public outputEvents: IToolPropContext[] | null;
    public variables: IToolPropContext[] | null;

    public columns: ITableColumns[] = [];
    public displayedColumns: string[] = [];

    public _panelOpenState = true;
    public _type1 = true;
    public _type2 = true;
    public _type3 = true;
    public _type4 = true;
    public _gridStyle = '';
    public _systemProp = true;
    private _pOffset = 30;

    constructor() {
    }

    ngOnInit() {
        this.minWidth = 1600;
        this.headers = [];
        this.size = 0;
        this.totals = [];
        this.resultContext = null;
        this.blocks = null;
        this.inputEvents = null;
        this.outputEvents = null;
        this.variables = null;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.value) {
            this.onInit();
        }
    }

    onInit() {
        this.size = this.value.size || 2;
        this.totals = this.value.totals;
        this.minWidth = 770 * this.size;

        const k = Math.round(100 / this.size);
        this._gridStyle = `max(calc(${k}vw - 80px), 680px)`;
        for (let i = 1; i < this.size; i++) {
            this._gridStyle += ` 35px max(calc(${k}vw - 45px), 720px)`;
        }

        this.createHeaders(this.value);

        const blocks = this.value.blocks;
        const inputEvents = this.value.inputEvents;
        const outputEvents = this.value.outputEvents;
        const variables = this.value.variables;

        this.resultContext = this.createResultContext(this.value);
        this.blocks = this.createTreeContext(blocks?.report);
        this.inputEvents = this.createToolPropContext(inputEvents?.report);
        this.outputEvents = this.createToolPropContext(outputEvents?.report);
        this.variables = this.createToolPropContext(variables?.report);

        this.columns = blocks?.columns || [];
        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);
    }

    private createHeaders(data: any): void {
        if (this.size > 2) {
            this.headers = [];
            this.headers.push({
                column: 0,
                name: data.left.name,
                color: 'none',
                rate: ''
            });
            for (let i = 0; i < data.rights.length; i++) {
                const rate = data.totals[i];
                const right = data.rights[i];
                let color = 'none';
                if (rate > 80) {
                    color = 'green';
                } else if (rate > 50) {
                    color = 'yellow';
                } else {
                    color = 'red';
                }
                this.headers.push({
                    column: 2 * this.headers.length + 1,
                    name: right.name,
                    color: color,
                    rate: `${rate}%`
                });
            }
        } else {
            this.headers = [];
        }
    }

    private createResultContext(data: any): IResultContext<IToolInfoContext>[] {
        const results: IResultContext<IToolInfoContext>[] = new Array(this.size);
        if (this.size > 2) {
            for (let i = 0; i < this.size; i++) {
                if (i === 0) {
                    results[i] = {
                        left: true,
                        right: false,
                        index: i,
                        data: data.left
                    }
                } else {
                    results[i] = {
                        left: false,
                        right: true,
                        index: i,
                        data: data.rights[i - 1]
                    }
                }
            }
        } else {
            results[0] = {
                left: true,
                right: false,
                index: 0,
                data: data.left
            }
            results[1] = {
                left: false,
                right: true,
                index: 1,
                data: data.right
            }
        }
        return results;
    }

    private createToolPropContext(array?: any[]): IToolPropContext[] {
        if (!Array.isArray(array)) {
            return [];
        }

        const results: IToolPropContext[] = [];
        for (const variable of array) {
            const contexts: IResultContext<IToolDetailsContext>[] = new Array(this.size);
            for (let index = 0; index < this.size; index++) {
                const propertiesContexts: IPropertiesContext[] = [];
                for (const variableConfig of variable.properties) {
                    const propertiesContext: IPropertiesContext = {
                        fantom: false,
                        type: '',
                        item: '',
                        lvl: '',
                        name: '',
                        offset: '',
                        propType: '',
                        value: '',
                    }
                    if (this.size === 2) {
                        const items = variableConfig.items || [];
                        const root = variableConfig;
                        propertiesContext.item = items[index];
                        propertiesContext.type = root.type;
                        if (!propertiesContext.item) {
                            propertiesContext.fantom = true;
                            propertiesContext.item = items.find((p: any) => !!p);
                        }
                    } else {
                        const items = variableConfig || [];
                        let root = items[index];
                        if (!root) {
                            propertiesContext.fantom = true;
                            root = items.find((p: any) => !!p);
                        }
                        if (root) {
                            propertiesContext.item = root.item;
                            propertiesContext.type = root.type;
                        }
                    }
                    if (propertiesContext.item) {
                        propertiesContext.name = propertiesContext.item.name;
                        propertiesContext.propType = propertiesContext.item.type;
                        propertiesContext.value = propertiesContext.item.value;
                        propertiesContext.lvl = propertiesContext.item.lvl;
                        propertiesContext.offset = 10 * propertiesContext.lvl;
                    }
                    debugger;
                    propertiesContexts.push(propertiesContext);
                }
                const variableContext: IResultContext<IToolDetailsContext> = {
                    index,
                    left: index === 0,
                    right: index !== 0,
                    fantom: false,
                    data: {
                        index,
                        properties: propertiesContexts
                    }
                }
                contexts[index] = variableContext;
            }
            const row: IToolPropContext = {
                type: variable.type,
                total_rate: variable.total_rate,
                contexts
            };
            results.push(row);
        }
        return results;
    }

    private createTreeContext(
        blocks?: any[]
    ): ITreeContext<IBlockContext, IBlockDetailsContext>[] | null {
        if (!blocks) {
            return null;
        }

        let max = 0;
        const results: ITreeContext<IBlockContext, IBlockDetailsContext>[] = [];

        for (let i = 0; i < blocks.length; i++) {
            const current = blocks[i];
            const next = blocks[i + 1];
            const contexts = this.createTreeItemContext(current);
            const detailContexts = this.createTreeDetailsContext(current);
            const item: ITreeContext<IBlockContext, IBlockDetailsContext> = {
                index: i,
                number: i + 1,
                lvl: current.lvl,
                hidden: false,
                collapse: (current && next && next.lvl > current.lvl) ? 1 : 0,
                open: false,
                offset: 0,
                contexts,
                detailContexts,
                data: current
            }
            results.push(item);
            max = Math.max(max, current.lvl);
        }
        if (max > 10) {
            this._pOffset = 20;
        }
        if (max > 15) {
            this._pOffset = 15;
        }
        for (const item of results) {
            item.offset = this._pOffset * item.lvl;
        }
        return results;
    }

    private createTreeItemContext(row: any): ITreeItemContext<IBlockContext>[] {
        const contexts: ITreeItemContext<IBlockContext>[] = new Array(this.size);
        for (let j = 0; j < this.size; j++) {
            const data: IBlockContext = this.createBlockContext(row, j);
            const context: ITreeItemContext<IBlockContext> = {
                type: '',
                key: '',
                rate: -1,
                left: j === 0,
                right: j !== 0,
                index: j,
                fantom: true,
                data
            }
            this.setDocumentContextKey(row, j, context);
            contexts[j] = context;
        }
        const first = contexts.find(c => !c.fantom);
        if (first) {
            for (const context of contexts) {
                if (context.fantom) {
                    context.data = first.data;
                }
            }
        }
        return contexts;
    }

    private createTreeDetailsContext(row: any): ITreeItemContext<IBlockDetailsContext>[] {
        const contexts: ITreeItemContext<IBlockDetailsContext>[] = new Array(this.size);
        for (let j = 0; j < this.size; j++) {
            const data: IBlockDetailsContext = this.createBlockDetailsContext(row, j);
            const context: ITreeItemContext<IBlockDetailsContext> = {
                type: '',
                key: '',
                rate: -1,
                left: j === 0,
                right: j !== 0,
                index: j,
                fantom: true,
                data
            }
            this.setDocumentContextKey(row, j, context);
            contexts[j] = context;
        }
        return contexts;
    }

    private setDocumentContextKey(row: any, index: number, context: ITreeItemContext<any>): void {
        if (index === 0) {
            context.type = row[`type`];
            context.rate = row[`total_rate`];
            context.key = row['left_type'];
        } else {
            if (this.size === 2) {
                context.type = row[`type`];
                context.rate = row[`total_rate`];
                context.key = row[`right_type`];
            } else {
                context.type = row[`type_${index}`];
                context.rate = row[`total_rate_${index}`];
                context.key = row[`right_type_${index}`];
            }
        }
        context.fantom = !context.key;
    }

    private createBlockContext(row: any, index: number): IBlockContext {
        if (index === 0) {
            const context: IBlockContext = {
                indexRate: row[`index_rate`],
                blockIndex: row[`left_index`],
                blockType: row[`left_type`],
                blockTag: row[`left_tag`],
                blockIcon: '',
                blockName: ''
            }
            context.blockIcon = this.icons[context.blockType];
            context.blockName = context.blockTag || context.blockType || '';
            return context;
        } else {
            if (this.size === 2) {
                const context: IBlockContext = {
                    indexRate: row[`index_rate`],
                    blockIndex: row[`right_index`],
                    blockType: row[`right_type`],
                    blockTag: row[`right_tag`],
                    blockIcon: '',
                    blockName: ''
                }
                context.blockIcon = this.icons[context.blockType];
                context.blockName = context.blockTag || context.blockType || '';
                return context;
            } else {
                const context: IBlockContext = {
                    indexRate: row[`index_rate_${index}`],
                    blockIndex: row[`right_index_${index}`],
                    blockType: row[`right_type_${index}`],
                    blockTag: row[`right_tag_${index}`],
                    blockIcon: '',
                    blockName: ''
                }
                context.blockIcon = this.icons[context.blockType];
                context.blockName = context.blockTag || context.blockType || '';
                return context;
            }
        }
    }

    private createBlockPropContext(data: any, index: number): IBlockPropContext {
        const context: IBlockPropContext = {
            fantom: true,
            type: index === 0 ? 'RIGHT' : 'LEFT'
        }
        let item: any;
        let field: any;
        let items: any[];
        if (this.size === 2) {
            field = data;
            item = data.items[index];
            items = data.items;
        } else {
            field = data[index];
            item = field?.item;
            items = data.map((f: any) => f?.item);
        }
        if (field && item) {
            context.fantom = false;
            context.item = item;
        } else {
            const fantom = items ? items.find((i: any) => i) : null;
            context.fantom = true;
            context.item = fantom;
        }
        return context;
    }

    private createBlockDetailsContext(row: any, index: number): IBlockDetailsContext {
        const propertiesContexts: IBlockPropContext[] = [];
        const permissionsContexts: IBlockPropContext[] = [];
        const eventsContexts: IBlockPropContext[] = [];
        const artifactsContexts: IBlockPropContext[] = [];

        for (const properties of row.properties) {
            const context = this.createBlockPropContext(properties, index) as IPropertiesContext;
            if (context.item) {
                context.lvl = context.item.lvl;
                context.offset = 10 * context.item.lvl;
                context.name = context.item.name;
                context.propType = context.item.type;
                context.value = context.item.value;
            }
            propertiesContexts.push(context);
        }
        for (const permissions of row.permissions) {
            const context = this.createBlockPropContext(permissions, index) as IPermissionsContext;
            if (context.item) {
                context.value = context.item;
                context.name = String(permissionsContexts.length);
            }
            permissionsContexts.push(context);
        }
        for (const events of row.events) {
            const context = this.createBlockPropContext(events, index) as IEventsContext;
            if (context.item) {
                context.value = true;
                context.source = context.item.source;
                context.output = context.item.output;
                context.target = context.item.target;
                context.input = context.item.input;
                context.actor = context.item.actor;
                context.disabled = context.item.disabled;
            }
            eventsContexts.push(context);
        }
        for (const artifacts of row.artifacts) {
            const context = this.createBlockPropContext(artifacts, index) as IArtifactsContext;
            if (context.item) {
                context.value = true;
                context.fileName = context.item.name;
                context.fileExtension = context.item.extension;
                context.fileType = context.item.type;
                context.fileHash = context.item.weight;
            }
            artifactsContexts.push(context);
        }

        if (index === 0) {
            const blockDetails: IBlockDetailsContext = {
                index,
                type: row[`'left_type`],
                blockType: row[`'left_type`],
                permissionRate: row[`permission_rate`],
                propRate: row[`prop_rate`],
                eventRate: row[`event_rate`],
                artifactsRate: row[`artifacts_rate`],
                totalRate: row[`total_rate`],
                properties: propertiesContexts,
                permissions: permissionsContexts,
                events: eventsContexts,
                artifacts: artifactsContexts
            }
            return blockDetails;
        } else {
            if (this.size === 2) {
                const blockDetails: IBlockDetailsContext = {
                    index,
                    type: row[`right_type`],
                    blockType: row[`right_type`],
                    permissionRate: row[`permission_rate`],
                    propRate: row[`prop_rate`],
                    eventRate: row[`event_rate`],
                    artifactsRate: row[`artifacts_rate`],
                    totalRate: row[`total_rate`],
                    properties: propertiesContexts,
                    permissions: permissionsContexts,
                    events: eventsContexts,
                    artifacts: artifactsContexts
                }
                return blockDetails;
            } else {
                const blockDetails: IBlockDetailsContext = {
                    index,
                    type: row[`right_type_${index}`],
                    blockType: row[`right_type_${index}`],
                    permissionRate: row[`permission_rate_${index}`],
                    propRate: row[`prop_rate_${index}`],
                    eventRate: row[`event_rate_${index}`],
                    artifactsRate: row[`artifacts_rate_${index}`],
                    totalRate: row[`total_rate_${index}`],
                    properties: propertiesContexts,
                    permissions: permissionsContexts,
                    events: eventsContexts,
                    artifacts: artifactsContexts
                }
                return blockDetails;
            }
        }
    }

    public _toInfoContext(data: any): IToolInfoContext {
        return data;
    }

    public _toBlockDetailsContext(data: any): IBlockDetailsContext {
        return data;
    }

    public _toPropInfoContext(data: any): IToolDetailsContext {
        return data;
    }

    public compareSchema(prop: any) {
        const schema1 = prop?.items[0];
        const schema2 = prop?.items[1];
        this.change.emit({
            type: 'schema',
            schemaId1: schema1?.schemaId,
            schemaId2: schema2?.schemaId
        })
    }

    public onCollapse(item: ITreeContext<IBlockContext, IBlockDetailsContext>): void {
        if (!this.blocks) {
            return;
        }
        const hidden = item.collapse == 1;
        if (hidden) {
            item.collapse = 2;
        } else {
            item.collapse = 1;
        }
        for (let i = item.index + 1; i < this.blocks.length; i++) {
            const item2 = this.blocks[i];
            if (item2.lvl > item.lvl) {
                item2.hidden = hidden;
            } else {
                break;
            }
        }
    }

    public onScroll(event: any) {
        document.querySelectorAll('.left-tree').forEach(el => {
            el.scrollLeft = event.target.scrollLeft;
        })
    }
}
