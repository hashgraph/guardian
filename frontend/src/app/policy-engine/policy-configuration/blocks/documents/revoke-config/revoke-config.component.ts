import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'interfaceAction' type.
 */
@Component({
    selector: 'revoke-config',
    templateUrl: './revoke-config.component.html',
    styleUrls: ['./revoke-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class RevokeConfigComponent implements OnInit {
    // @Input('all') all!: PolicyBlockModel[];
    // @Input('schemes') schemes!: Schema[];
    // @Input('tokens') tokens!: Token[];
    // @Input('readonly') readonly!: boolean;
    // @Input('roles') roles!: string[];
    // @Input('topics') topics!: any[];
    // @Input('block') currentBlock!: PolicyBlockModel;
    // @Output() onInit = new EventEmitter();

    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    
    propHidden: any = {
        main: false,
        optionsGroup: false,
        fileGroup: false,
        options: {},
        dropdownGroup: false
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
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.options = this.block.uiMetaData.options || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}