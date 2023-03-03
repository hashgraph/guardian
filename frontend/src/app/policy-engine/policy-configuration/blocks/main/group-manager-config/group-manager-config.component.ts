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
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        main: false,
    };

    properties!: any;

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
        this.item = block;
        this.properties = block.properties;
        this.properties.visible = this.properties.visible || 'owner';
        this.properties.canInvite = this.properties.canInvite || 'owner';
        this.properties.canDelete = this.properties.canDelete || 'owner';
        this.properties.uiMetaData = this.properties.uiMetaData || {};
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
    
    onSave() {
        this.item.changed = true;
    }
}
