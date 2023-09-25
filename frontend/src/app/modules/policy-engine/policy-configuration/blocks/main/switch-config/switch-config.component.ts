import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock } from '../../../../structures';

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
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;
    
    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
    };

    properties!: any;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.executionFlow = this.properties.executionFlow || 'firstTrue';
        this.properties.conditions = this.properties.conditions || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addCondition() {
        this.properties.conditions.push({
            tag: `Condition_${this.properties.conditions.length}`,
            type: 'equal',
            value: '',
            actor: '',
        })
    }

    onRemoveCondition(i: number) {
        this.properties.conditions.splice(i, 1);
    }
    
    onSave() {
        this.item.changed = true;
    }
}
