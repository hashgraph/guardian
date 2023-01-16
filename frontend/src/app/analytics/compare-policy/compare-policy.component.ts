import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-compare-policy',
    templateUrl: './compare-policy.component.html',
    styleUrls: ['./compare-policy.component.css']
})
export class ComparePolicyComponent implements OnInit {
    @Input('value') value!: any;

    panelOpenState = true;

    type = 'tree';

    policy1: any;
    policy2: any;
    total!: any;

    blocks!: any[];
    topics!: any[];
    tokens!: any[];
    groups!: any[];
    roles!: any[];

    @Input() eventsLvl: string = '1';
    @Input() propLvl: string = '2';
    @Input() childrenLvl: string = '2';

    @Output() change = new EventEmitter<any>();

    displayedColumns: string[] = [];
    columns: any[] = [];

    icons: any = {
        "interfaceContainerBlock": "tab",
        "interfaceStepBlock": "vertical_split",
        "policyRolesBlock": "manage_accounts",
        "groupManagerBlock": "groups",
        "informationBlock": "info",
        "interfaceActionBlock": "flash_on",
        "buttonBlock": "radio_button_checked",
        "switchBlock": "rule",
        "interfaceDocumentsSourceBlock": "table_view",
        "requestVcDocumentBlock": "dynamic_form",
        "multiSignBlock": "done_all",
        "sendToGuardianBlock": "send",
        "externalDataBlock": "cloud",
        "aggregateDocumentBlock": "calendar_month",
        "reassigningBlock": "content_copy",
        "revokeBlock": "restart_alt",
        "setRelationshipsBlock": "settings",
        "splitBlock": "content_cut",
        "filtersAddon": "filter_alt",
        "documentsSourceAddon": "source",
        "paginationAddon": "pages",
        "timerBlock": "schedule",
        "documentValidatorBlock": "task_alt",
        "createTokenBlock": "token",
        "mintDocumentBlock": "paid",
        "retirementDocumentBlock": "delete",
        "tokenActionBlock": "generating_tokens",
        "tokenConfirmationBlock": "key",
        "impactAddon": "receipt",
        "calculateContainerBlock": "bar_chart",
        "customLogicBlock": "bar_chart",
        "calculateMathAddon": "calculate",
        "calculateMathVariables": "123",
        "reportBlock": "addchart",
        "reportItemBlock": "list_alt"
    }

    type1 = true;
    type2 = true;
    type3 = true;
    type4 = true;

    constructor() {
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

        this.roles = roles?.report;
        this.groups = groups?.report;
        this.tokens = tokens?.report;
        this.topics = topics?.report;
        this.blocks = blocks?.report;

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
        }

        this.columns = blocks?.columns || [];

        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);
        this.onRender();
    }

    onRender() {
    }

    onApply() {
        this.change.emit({
            type: 'params',
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl
        })
    }

    compareSchema(prop: any) {
        const schema1 = prop?.items[0];
        const schema2 = prop?.items[1];
        this.change.emit({
            type: 'schema',
            schemaId1: schema1?.schemaId,
            schemaId2: schema2?.schemaId
        })
    }

    onCollapse(item:any) {
        const hidden = item._collapse == 1;
        if(hidden) {
            item._collapse = 2;
        } else {
            item._collapse = 1;
        }
        for (let i = item._index+1; i < this.blocks.length; i++) {
            const item2 = this.blocks[i];
            if(item2.lvl > item.lvl) {
                item2._hidden = hidden;
            } else {
                break;
            }
        }
    }
}
