import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import BlockIcons from '../../policy-engine/services/block-icons';
import { CompareStorage } from 'src/app/services/compare-storage.service';

@Component({
    selector: 'app-compare-policy',
    templateUrl: './compare-policy.component.html',
    styleUrls: ['./compare-policy.component.scss']
})
export class ComparePolicyComponent implements OnInit {
    @Input('value') value!: any;
    @Input() type: string = 'tree';
    @Input() eventsLvl: string = '1';
    @Input() propLvl: string = '2';
    @Input() childrenLvl: string = '2';
    @Input() idLvl: string = '1';

    @Output() change = new EventEmitter<any>();

    public panelOpenState = true;

    public policy1: any;
    public policy2: any;
    public total!: any;

    public blocks!: any[];
    public topics!: any[];
    public tokens!: any[];
    public groups!: any[];
    public roles!: any[];
    public tools!: any[];

    public displayedColumns: string[] = [];
    public columns: any[] = [];

    public icons: any = Object.assign({}, BlockIcons);

    public type1 = true;
    public type2 = true;
    public type3 = true;
    public type4 = true;

    public _pOffset = 30;

    constructor(private compareStorage: CompareStorage) {
    }

    ngOnInit() {

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.value) {
            this.onInit();
        }
    }

    onInit() {
        this.total = this.value.total;
        this.policy1 = this.value.left;
        this.policy2 = this.value.right;

        const blocks = this.value.blocks;
        const roles = this.value.roles;
        const groups = this.value.groups;
        const tokens = this.value.tokens;
        const topics = this.value.topics;
        const tools = this.value.tools;

        this.roles = roles?.report;
        this.groups = groups?.report;
        this.tokens = tokens?.report;
        this.topics = topics?.report;
        this.blocks = blocks?.report;
        this.tools = tools?.report;

        let max = 0;
        for (let i = 0; i < this.blocks.length; i++) {
            const item1 = this.blocks[i];
            const item2 = this.blocks[i + 1];
            if (item1 && item2 && item2.lvl > item1.lvl) {
                item1._collapse = 1;
            } else {
                item1._collapse = 0;
            }
            item1._hidden = false;
            item1._index = i;
            max = Math.max(max, item1.lvl);
        }
        if (max > 10) {
            this._pOffset = 20;
        }
        if (max > 15) {
            this._pOffset = 15;
        }

        this.columns = blocks?.columns || [];

        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);

        this.onRender();
    }

    private onRender() {
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

    public compareSchema(prop: any) {
        this.change.emit({
            type: 'schema',
            schemaIds: [
                this.getSchemaId(prop?.items[0], this.policy1),
                this.getSchemaId(prop?.items[1], this.policy2)
            ]
        })
    }

    public onCollapse(item: any) {
        const hidden = item._collapse == 1;
        if (hidden) {
            item._collapse = 2;
        } else {
            item._collapse = 1;
        }
        for (let i = item._index + 1; i < this.blocks.length; i++) {
            const item2 = this.blocks[i];
            if (item2.lvl > item.lvl) {
                item2._hidden = hidden;
            } else {
                break;
            }
        }
    }

    public getPolicyId(policy: any): string {
        if (policy.type === 'file') {
            return this.compareStorage.getFile(policy.id)?.name || policy.id;
        }
        return policy.id;
    }

    isObject(value: any): boolean {
        return value !== null && typeof value === 'object';
    }
}
