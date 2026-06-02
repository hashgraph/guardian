import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import BlockIcons from '../../policy-engine/services/block-icons';
import { CompareStorage } from 'src/app/services/compare-storage.service';

@Component({
    selector: 'app-multi-compare-policy',
    templateUrl: './multi-compare-policy.component.html',
    styleUrls: ['./multi-compare-policy.component.scss']
})
export class MultiComparePolicyComponent implements OnInit {
    @Input('value') value!: any;
    @Input() type: string = 'tree';
    @Input() eventsLvl: string = '1';
    @Input() propLvl: string = '2';
    @Input() childrenLvl: string = '2';
    @Input() idLvl: string = '1';

    @Output() change = new EventEmitter<any>();

    public size: any;
    public policies: any[];
    public totals!: any[];
    public blocks!: any[];
    public topics!: any[];
    public tokens!: any[];
    public groups!: any[];
    public roles!: any[];
    public tools!: any[];
    public minWidth!: any;
    public headers: any[];

    public displayedColumns: string[] = [];
    public columns: any[] = [];
    public panelOpenState = true;

    public readonly icons: any = Object.assign({}, BlockIcons);

    public type1 = true;
    public type2 = true;
    public type3 = true;
    public type4 = true;

    public _pOffset = 30;
    public _scroll = 0;
    public _gridStyle = '';

    constructor(private compareStorage: CompareStorage) {
    }

    ngOnInit() {
        this.minWidth = 1600;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.value) {
            this.onInit();
        }
    }

    onInit() {
        this.size = this.value.size;
        this.totals = this.value.totals;
        this.minWidth = 770 * this.size;

        this.headers = [];
        if (this.value.left) {
            this.headers.push({
                column: 0,
                name: this.value.left.name,
                color: 'none',
                rate: ''
            });
        }
        for (let i = 0; i < this.value.rights.length; i++) {
            const rate = this.value.totals[i];
            const right = this.value.rights[i];
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
        const blocks = this.value.blocks;
        const roles = this.value.roles;
        const groups = this.value.groups;
        const tokens = this.value.tokens;
        const topics = this.value.topics;
        const tools = this.value.tools;

        this.columns = blocks?.columns || [];
        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);

        this.roles = this.createContext(roles?.report);
        this.groups = this.createContext(groups?.report);
        this.tokens = this.createContext(tokens?.report);
        this.topics = this.createContext(topics?.report);
        this.policies = this.createPolicyContext(this.value.left, this.value.rights);
        this.blocks = this.createTreeContext(blocks?.report);
        this.tools = this.createContext(tools?.report);

        const k = Math.round(100 / this.size);
        this._gridStyle = `max(calc(${k}vw - 40px), 720px)`;
        for (let i = 1; i < this.size; i++) {
            this._gridStyle += ` 35px max(calc(${k}vw - 40px), 720px)`;
        }
    }

    private createPolicyContext(left: any, rights: any[]): any[] {
        const policies = new Array(this.size);
        for (let i = 0; i < this.size; i++) {
            if (i === 0) {
                policies[i] = {
                    left: true,
                    right: false,
                    index: i,
                    policy: left
                }
            } else {
                policies[i] = {
                    left: false,
                    right: true,
                    index: i,
                    policy: rights[i - 1]
                }
            }
        }
        return policies;
    }

    private createTreeContext(blocks?: any[]): any[] {
        let max = 0;
        const results: any[] = [];

        if (Array.isArray(blocks)) {
            for (let i = 0; i < blocks.length; i++) {
                const current = blocks[i];
                const next = blocks[i + 1];
                const contexts = this.createBlockContext(current);
                const info = this.createInfoContext(current);
                const item = {
                    hidden: false,
                    index: i,
                    number: i + 1,
                    lvl: current.lvl,
                    collapse: (current && next && next.lvl > current.lvl) ? 1 : 0,
                    type: null,
                    rate: null,
                    open: false,
                    offset: 0,
                    contexts,
                    info,
                    data: current
                }
                results.push(item);
                max = Math.max(max, current.lvl);
            }
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

    private createInfoContext(row: any): any[] {
        const contexts = new Array(this.size);
        for (let j = 0; j < this.size; j++) {
            const data: any = {
                index: j,
                blockType: '',
                permissionRate: '',
                propRate: '',
                eventRate: '',
                artifactsRate: '',
                totalRate: '',
                properties: [],
                permissions: [],
                events: [],
                artifacts: []
            }
            if (j === 0) {
                data.blockType = row['left_type'];
                data.permissionRate = '-';
                data.propRate = '-';
                data.eventRate = '-';
                data.artifactsRate = '-';
                data.totalRate = '-';
            } else {
                data.blockType = row[`right_type_${j}`];
                data.permissionRate = row[`permission_rate_${j}`];
                data.propRate = row[`prop_rate_${j}`];
                data.eventRate = row[`event_rate_${j}`];
                data.artifactsRate = row[`artifacts_rate_${j}`];
                data.totalRate = row[`total_rate_${j}`];
            }

            for (const properties of row.properties) {
                const prop = properties[j];
                const left = properties[0];
                const propContext = {
                    fantom: true,
                    type: j === 0 ? 'RIGHT' : 'LEFT',
                    lvl: 0,
                    offset: 0,
                    name: '',
                    propType: '',
                    value: '',
                    left: left?.item,
                    right: prop?.item
                }
                if (prop && prop.item) {
                    propContext.fantom = false;
                    propContext.type = prop.type;
                    propContext.lvl = prop.item.lvl;
                    propContext.offset = 10 * prop.item.lvl;
                    propContext.name = prop.item.name;
                    propContext.propType = prop.item.type;
                    propContext.value = prop.item.value;
                } else {
                    const fantom = properties.find((p: any) => p && p.item);
                    if (fantom) {
                        propContext.lvl = fantom.item.lvl;
                        propContext.offset = 10 * fantom.item.lvl;
                        propContext.name = fantom.item.name;
                        propContext.propType = fantom.item.type;
                    }
                }
                data.properties.push(propContext);
            }

            for (const permissions of row.permissions) {
                const permission = permissions[j];
                const permissionContext = {
                    fantom: true,
                    type: j === 0 ? 'RIGHT' : 'LEFT',
                    name: String(data.permissions.length),
                    value: ''
                }
                if (permission && permission.item) {
                    permissionContext.fantom = false;
                    permissionContext.type = permission.type;
                    permissionContext.value = permission.item;
                } else {
                    const fantom = permissions.find((p: any) => p && p.item);
                    if (fantom) {
                        permissionContext.value = fantom.item;
                    }
                }
                data.permissions.push(permissionContext);
            }

            for (const events of row.events) {
                const event = events[j];
                const eventContext = {
                    fantom: true,
                    type: j === 0 ? 'RIGHT' : 'LEFT',
                    value: false,
                    source: '',
                    output: '',
                    target: '',
                    input: '',
                    actor: '',
                    disabled: ''
                }
                if (event && event.item) {
                    eventContext.fantom = false;
                    eventContext.type = event.type;
                    eventContext.value = true;
                    eventContext.source = event.item.source;
                    eventContext.output = event.item.output;
                    eventContext.target = event.item.target;
                    eventContext.input = event.item.input;
                    eventContext.actor = event.item.actor;
                    eventContext.disabled = event.item.disabled;
                } else {
                    const fantom = events.find((p: any) => p && p.item);
                    if (fantom) {
                        eventContext.value = true;
                    }
                }
                data.events.push(eventContext);
            }

            for (const artifacts of row.artifacts) {
                const artifact = artifacts[j];
                const artifactContext = {
                    fantom: true,
                    type: j === 0 ? 'RIGHT' : 'LEFT',
                    value: false,
                    fileName: '',
                    fileExtension: '',
                    fileType: '',
                    fileHash: ''
                }
                if (artifact && artifact.item) {
                    artifactContext.fantom = false;
                    artifactContext.type = artifact.type;
                    artifactContext.value = true;
                    artifactContext.fileName = artifact.item.name;
                    artifactContext.fileExtension = artifact.item.extension;
                    artifactContext.fileType = artifact.item.type;
                    artifactContext.fileHash = artifact.item.weight;
                } else {
                    const fantom = artifacts.find((p: any) => p && p.item);
                    if (fantom) {
                        artifactContext.value = true;
                    }
                }
                data.artifacts.push(artifactContext);
            }

            const context = {
                left: j === 0,
                right: j !== 0,
                index: j,
                fantom: !data.blockType,
                data
            }
            contexts[j] = context;
        }

        return contexts;
    }

    private createBlockContext(row: any): any[] {
        const contexts = new Array(this.size);

        let first: any = null;
        for (let j = 0; j < this.size; j++) {
            const context = {
                left: j === 0,
                right: j !== 0,
                index: j,
                fantom: true,
                blockType: '',
                blockIndex: '',
                blockTag: '',
                blockIcon: '',
                blockName: '',
                indexRate: -1,
                totalRate: -1,
                type: '',
            }
            if (j === 0) {
                context.blockType = row['left_type'];
                context.blockIndex = row[`left_index`];
                context.blockTag = row[`left_tag`];
                context.indexRate = -1;
                context.totalRate = -1;
                context.type = '';
            } else {
                context.blockType = row[`right_type_${j}`];
                context.blockIndex = row[`right_index_${j}`];
                context.blockTag = row[`right_tag_${j}`];
                context.indexRate = row[`index_rate_${j}`];
                context.totalRate = row[`total_rate_${j}`];
                context.type = row[`type_${j}`];
            }
            context.fantom = !context.blockType;
            context.blockIcon = this.icons[context.blockType];
            context.blockName = context.blockTag || context.blockType || '';

            if (!context.fantom && !first) {
                first = context;
            }
            contexts[j] = context;
        }
        if (first) {
            for (const context of contexts) {
                if (context.fantom) {
                    context.blockType = first.blockType;
                    context.blockIndex = first.blockIndex;
                    context.blockTag = first.blockTag;
                    context.blockIcon = first.blockIcon;
                    context.blockName = first.blockName;
                    if (context.left) {
                        context.indexRate = -1;
                        context.totalRate = -1;
                        context.type = '';
                    } else {
                        context.indexRate = first.indexRate;
                        context.totalRate = first.totalRate;
                        context.type = first.type;
                    }
                }
            }
        }
        return contexts;
    }

    private createContext(array?: any[]): any[] {
        if (Array.isArray(array)) {
            for (const row of array) {
                row.contexts = new Array(this.size);
                for (let index = 0; index < this.size; index++) {
                    const data: any = {
                        properties: []
                    };
                    for (const properties of row.properties) {
                        const prop = properties[index];
                        const propContext = {
                            fantom: true,
                            type: index === 0 ? 'RIGHT' : 'LEFT',
                            lvl: 0,
                            offset: 0,
                            name: '',
                            propType: '',
                            value: '',
                        }
                        if (prop && prop.item) {
                            propContext.fantom = false;
                            propContext.type = prop.type;
                            propContext.lvl = prop.item.lvl;
                            propContext.offset = 10 * prop.item.lvl;
                            propContext.name = prop.item.name;
                            propContext.propType = prop.item.type;
                            propContext.value = prop.item.value;
                        } else {
                            const fantom = properties.find((p: any) => p && p.item);
                            if (fantom) {
                                propContext.lvl = fantom.item.lvl;
                                propContext.offset = 10 * fantom.item.lvl;
                                propContext.name = fantom.item.name;
                                propContext.propType = fantom.item.type;
                            }
                        }
                        data.properties.push(propContext);
                    }
                    row.contexts[index] = {
                        left: index === 0,
                        right: index !== 0,
                        index,
                        data,
                    };
                }
            }
            return array;
        } else {
            return [];
        }
    }

    private getSchemaId(schema: any, policy: any): any {
        if (policy?.type === 'message') {
            return {
                type: 'policy-message',
                value: schema?.value,
                policy: policy.id
            }
        } else if (policy?.type === 'file') {
            return {
                type: 'policy-file',
                value: schema?.value,
                policy: policy.id
            }
        } else {
            return {
                type: 'id',
                value: schema?.schemaId,
            }
        }
    }

    public compareSchema(prop: any, data: any) {
        const schema1 = prop.left;
        const schema2 = prop.right;
        if (
            schema1 &&
            schema2 &&
            schema1.schemaId &&
            schema2.schemaId
        ) {
            const left = this.policies[0]?.policy;
            const right = this.policies[data?.index]?.policy;
            this.change.emit({
                type: 'schema',
                schemaIds: [
                    this.getSchemaId(schema1, left),
                    this.getSchemaId(schema2, right)
                ]
            })
        }
    }

    public onCollapse(item: any) {
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

    public getPolicyId(policy: any): string {
        if (policy.type === 'file') {
            return this.compareStorage.getFile(policy.id)?.name || policy.id;
        }
        return policy.id;
    }
}
