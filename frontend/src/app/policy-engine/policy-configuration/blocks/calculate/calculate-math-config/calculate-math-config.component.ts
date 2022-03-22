import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'calculate-math-config',
    templateUrl: './calculate-math-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './calculate-math-config.component.css'
    ]
})
export class CalculateMathConfigComponent implements OnInit {
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        equationsGroup: false,
        equations: {},
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
        this.block.equations = this.block.equations || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addEquation() {
        this.block.equations.push({
            variable: '',
            formula: ''
        })
    }

    onRemoveEquation(i:number) {
        this.block.equations.splice(i, 1);
    }
}
