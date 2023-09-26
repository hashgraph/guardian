import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { GroupVariables, IModuleVariables, PolicyBlock, RoleVariables } from '../../../../structures';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'roles-config',
    templateUrl: './roles-config.component.html',
    styleUrls: ['./roles-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class RolesConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;
    
    propHidden: any = {
        main: false,
    };

    properties!: any;
    roles!: RoleVariables[];
    groups!: GroupVariables[];

    constructor() {
    }

    ngOnInit(): void {
        this.roles = [];
        this.groups = [];
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
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.roles = this.moduleVariables?.roles || [];
        this.groups = this.moduleVariables?.groups || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
    
    onSave() {
        this.item.changed = true;
    }
}
