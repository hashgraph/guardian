import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'group-manager-config',
    templateUrl: './group-manager-config.component.html',
    styleUrls: ['./group-manager-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class GroupManagerConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
    };

    block!: any;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.block = block.properties;
        this.block.visible = this.block.visible || 'owner';
        this.block.canInvite = this.block.canInvite || 'owner';
        this.block.canDelete = this.block.canDelete || 'owner';
        this.block.uiMetaData = this.block.uiMetaData || {};
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}
