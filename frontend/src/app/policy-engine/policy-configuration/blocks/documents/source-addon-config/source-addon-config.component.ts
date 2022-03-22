import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'sendToGuardian' type.
 */
@Component({
    selector: 'source-addon-config',
    templateUrl: './source-addon-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './source-addon-config.component.css'
    ]
})
export class SourceAddonConfigComponent implements OnInit {
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        filtersGroup: false,
        filters: {},
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
        this.block.filters = this.block.filters || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addField() {
        this.block.filters.push({
            value: '',
            field: '',
            type: 'equal',
        })
    }
}
