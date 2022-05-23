import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/policy-model';
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
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        equationsGroup: false,
        equations: {},
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
