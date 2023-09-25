import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock } from '../../../../structures';

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
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;
    
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

    load(block: PolicyBlock) {
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
