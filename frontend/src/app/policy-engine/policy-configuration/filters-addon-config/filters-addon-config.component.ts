import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../data-source/tree-data-source';

/**
 * Settings for block of 'interfaceSelector' type.
 */
@Component({
    selector: 'filters-addon-config',
    templateUrl: './filters-addon-config.component.html',
    styleUrls: [
        './../common-properties/common-properties.component.css',
        './filters-addon-config.component.css'
    ]
})
export class FiltersAddonConfigComponent implements OnInit {
    @Input('block') currentBlock!: BlockNode;
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('all') allBlocks!: BlockNode[];
    @Input('readonly') readonly!: boolean;

    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        optionsGroup: false,
        fileGroup: false,
        options: {},
        filterGroup: false,
        filters: {},
        dropdownGroup: false
    };

    block!: BlockNode;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
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
