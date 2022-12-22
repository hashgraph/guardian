import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuditService } from 'src/app/services/audit.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { HttpResponse } from '@angular/common/http';

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
    report!: any[];

    @Input() eventsLvl: string = '1';
    @Input() propLvl: string = '2';
    @Input() childrenLvl: string = '2';

    @Output() change = new EventEmitter<any>();

    displayedColumns: string[] = [
        'offset',
        'left_index',
        'left_type',
        'left_tag',
        'right_index',
        'right_type',
        'right_tag',
        'index_rate',
        'permission_rate',
        'prop_rate',
        'event_rate',
        'total_rate'
    ];

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
        this.policy1 = this.value.policy1;
        this.policy2 = this.value.policy2;
        this.report = this.value.report;
        this.onRender();
    }

    onRender() {
        console.log(this.policy1);
    }

    onApply() {
        this.change.emit({
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl
        })
    }
}
