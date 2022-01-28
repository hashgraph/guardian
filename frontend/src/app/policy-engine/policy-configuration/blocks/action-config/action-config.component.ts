import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'interfaceAction' type.
 */
@Component({
    selector: 'action-config',
    templateUrl: './action-config.component.html',
    styleUrls: [
        './../../common-properties/common-properties.component.css',
        './action-config.component.css'
    ]
})
export class ActionConfigComponent implements OnInit {
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        optionsGroup: false,
        fileGroup: false,
        options: {},
        dropdownGroup: false
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
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.options = this.block.uiMetaData.options || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addOptions() {
        this.block.uiMetaData.options.push({
            title: '',
            name: '',
            tooltip: '',
            type: 'text',
        })
    }

    addFilters() {
        if(!this.block.filters) {
            this.block.filters = [];
        }
        this.block.filters.push({
            title: '',
            name: '',
            tooltip: '',
            type: 'text',
        })
    }
}
