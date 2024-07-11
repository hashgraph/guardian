import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-compare-module',
    templateUrl: './compare-module.component.html',
    styleUrls: ['./compare-module.component.css']
})
export class CompareModuleComponent implements OnInit {
    @Input('value') value!: any;

    panelOpenState = true;

    module1: any;
    module2: any;
    total!: any;

    blocks!: any[];

    outputEvents!: any[];
    inputEvents!: any[];
    variables!: any[];

    @Input() type: string = 'tree';
    @Input() eventsLvl: string = '1';
    @Input() propLvl: string = '2';
    @Input() childrenLvl: string = '2';
    @Input() idLvl: string = '1';

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
        "revocationBlock": "restart_alt",
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
        "reportItemBlock": "list_alt",
        "messagesReportBlock": "addchart",
        "externalTopicBlock": "cloud",
        "notificationBlock": "notifications",
    }

    type1 = true;
    type2 = true;
    type3 = true;
    type4 = true;

    _pOffset = 30;
    _scroll = 0;

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
        this.module1 = this.value.left;
        this.module2 = this.value.right;

        const blocks = this.value.blocks;
        const inputEvents = this.value.inputEvents;
        const outputEvents = this.value.outputEvents;
        const variables = this.value.variables;

        this.inputEvents = inputEvents?.report;
        this.outputEvents = outputEvents?.report;
        this.variables = variables?.report;
        this.blocks = blocks?.report;

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
        if(max > 10) {
            this._pOffset = 20;
        }
        if(max > 15) {
            this._pOffset = 15;
        }

        this.columns = blocks?.columns || [];

        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);
        this.onRender();
    }

    onRender() {
    }

    compareSchema(prop: any) {
        const schemaId1 = prop?.items[0]?.schemaId;
        const schemaId2 = prop?.items[1]?.schemaId;
        this.change.emit({
            type: 'schema',
            schemaIds: [{
                type: 'id',
                value: schemaId1
            }, {
                type: 'id',
                value: schemaId2
            }]
        })
    }

    onCollapse(item: any) {
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

    onScroll(event:any) {
        document.querySelectorAll('.left-tree').forEach(el => {
            el.scrollLeft = event.target.scrollLeft;
        })
    }
}
