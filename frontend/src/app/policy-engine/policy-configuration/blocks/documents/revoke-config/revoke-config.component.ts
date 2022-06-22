import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyBlockModel } from 'src/app/policy-engine/policy-model';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'interfaceAction' type.
 */
@Component({
    selector: 'revoke-config',
    templateUrl: './revoke-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './revoke-config.component.css'
    ]
})
export class RevokeConfigComponent implements OnInit {
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Input('topics') topics!: any[];
    @Input('block') currentBlock!: PolicyBlockModel;
    @Output() onInit = new EventEmitter();

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
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.options = this.block.uiMetaData.options || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}