import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures/policy-model';

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
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

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
