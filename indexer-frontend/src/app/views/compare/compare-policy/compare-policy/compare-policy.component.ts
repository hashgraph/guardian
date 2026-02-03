import { Component, EventEmitter, HostBinding, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { AccordionModule } from 'primeng/accordion';
import { PanelModule } from 'primeng/panel';
import { DropdownModule } from 'primeng/dropdown';
import { FloatLabelModule } from 'primeng/floatlabel';

enum ItemType {
    Document = 'document',
    Policy = 'policy',
    Module = 'module',
    Schema = 'schema',
    Tool = 'tool'
}

@Component({
    selector: 'app-compare-policy',
    standalone: true,
    templateUrl: './compare-policy.component.html',
    styleUrls: ['./compare-policy.component.scss'],
    imports: [FormsModule, CommonModule, TableModule, AccordionModule, PanelModule, DropdownModule, FloatLabelModule]
})
export class ComparePolicyComponent implements OnInit {
    @Input('value') value!: any;
    @Input() type: string = 'tree';

    @Output() mergeLevel = new EventEmitter<any>();
    @Output() change = new EventEmitter<any>();

    public eventOptions = [
        { label: 'Exclude events', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public propertyOptions = [
        { label: 'Exclude properties', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public childrenOptions = [
        { label: 'Exclude child blocks', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public uuidOptions = [
        { label: 'Exclude ID', value: '0' },
        { label: 'Strict comparison', value: '1' }
    ];

    public typeOptions: any[] = [
        { label: 'Tree', value: 'tree' },
        { label: 'Table', value: 'table' }
    ];


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

    public icons: any = {};

    public type1 = true;
    public type2 = true;
    public type3 = true;
    public type4 = true;

    public visibleType: string = this.typeOptions[0].value;
    public eventsLvl: string = this.eventOptions[2].value;
    public propLvl: string = this.propertyOptions[2].value;
    public childrenLvl: string = this.childrenOptions[2].value;
    public idLvl: string = this.uuidOptions[0].value;
    public needApplyFilters: boolean = false;
    public itemType: ItemType;
    public colorBlindMode = false;
    
    @HostBinding('class.colorblind-mode')
    get colorBlindClass() {
        return this.colorBlindMode;
    }

    public _pOffset = 30;

    constructor() {
        this.itemType = ItemType.Policy;
    }

    ngOnInit() {
        const saved = localStorage.getItem('compare-policy-colorblind');
        this.colorBlindMode = saved === 'true';
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

    public get isEventsLvl(): boolean {
        return this.itemType === ItemType.Policy;
    }

    public get isPropertiesLvl(): boolean {
        return this.itemType === ItemType.Policy;
    }

    public get isChildrenLvl(): boolean {
        return this.itemType === ItemType.Policy;
    }

    public get isUUIDLvl(): boolean {
        return this.itemType !== ItemType.Document;
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
        return policy.id;
    }

    isObject(value: any): boolean {
        return value !== null && typeof value === 'object';
    }

    toggleColorBlindMode() {
        this.colorBlindMode = !this.colorBlindMode;
        localStorage.setItem('compare-policy-colorblind', String(this.colorBlindMode));
    }

    onFilterChange() {
        this.needApplyFilters = true;
    }

    onMergeLevelChange() {
        this.mergeLevel.emit({
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            idLvl: this.idLvl,
            childrenLvl: this.childrenLvl
        });
    }
}
