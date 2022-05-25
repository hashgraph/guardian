import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/policy-model';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'externalDataBlock' type.
 */
@Component({
    selector: 'external-data-config',
    templateUrl: './external-data-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './external-data-config.component.css'
    ]
})
export class ExternalDataConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemes') schemes!: Schema[];
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
        this.block.uiMetaData = this.block.uiMetaData || {}
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}
