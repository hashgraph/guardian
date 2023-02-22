import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { GroupVariables, IModuleVariables, PolicyBlockModel, RoleVariables } from 'src/app/policy-engine/structures';

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
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
    };

    block!: any;
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

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.roles = this.moduleVariables?.roles || [];
        this.groups = this.moduleVariables?.groups || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}
