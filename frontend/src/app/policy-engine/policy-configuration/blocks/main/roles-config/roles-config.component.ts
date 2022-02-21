import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'roles-config',
    templateUrl: './roles-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './roles-config.component.css'
    ]
})
export class RolesConfigComponent implements OnInit {
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
    };

    block!: BlockNode;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.target);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.target);
    }

    load(block: BlockNode) {
        this.block = block;
        this.block.uiMetaData = this.block.uiMetaData || {}
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}
