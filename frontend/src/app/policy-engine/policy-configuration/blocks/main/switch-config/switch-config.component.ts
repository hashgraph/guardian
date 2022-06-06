import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/policy-model';
import { RegisteredBlocks } from 'src/app/policy-engine/registered-blocks';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'switch' and 'interfaceStepBlock' types.
 */
@Component({
    selector: 'switch-config',
    templateUrl: './switch-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './switch-config.component.css'
    ]
})
export class SwitchConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
    };

    block!: any;

    constructor(public registeredBlocks: RegisteredBlocks) {
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
        this.block.executionFlow = this.block.executionFlow || 'firstTrue';
        this.block.conditions = this.block.conditions || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addCondition() {
        this.block.conditions.push({
            tag: `Condition_${this.block.conditions.length}`,
            type: 'equal',
            value: '',
            actor: '',
        })
    }

    onRemoveCondition(i: number) {
        this.block.conditions.splice(i, 1);
    }

    getIcon(block: any) {
        return this.registeredBlocks.getIcon(block.blockType);
    }
}
