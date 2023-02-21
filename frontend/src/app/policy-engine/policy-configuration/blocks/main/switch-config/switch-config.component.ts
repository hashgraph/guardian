import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'switch' and 'interfaceStepBlock' types.
 */
@Component({
    selector: 'switch-config',
    templateUrl: './switch-config.component.html',
    styleUrls: ['./switch-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class SwitchConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
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
        this.moduleVariables = block.moduleVariables;
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
}
