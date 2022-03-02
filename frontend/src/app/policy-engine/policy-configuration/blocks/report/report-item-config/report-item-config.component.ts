import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'reportItemBlock' type.
 */
@Component({
    selector: 'report-item-config',
    templateUrl: './report-item-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './report-item-config.component.css'
    ]
})
export class ReportItemConfigComponent implements OnInit {
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        filterGroup: false,
        filters: {},
        variableGroup: false,
        variables: {}
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
        this.block.variables = this.block.variables || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addVariable() {
        this.block.variables.push({});
    }

    onRemoveVariable(i: number) {
        this.block.variables.splice(i, 1);
    }

    addFilter() {
        this.block.filters.push({});
    }

    onRemoveFilter(i: number) {
        this.block.filters.splice(i, 1);
    }
}
