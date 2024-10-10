import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock } from '../../../../structures';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'calculate-math-config',
    templateUrl: './calculate-math-config.component.html',
    styleUrls: ['./calculate-math-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class CalculateMathConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        equationsGroup: false,
        equations: {},
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
        this.properties.equations = this.properties.equations || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addEquation() {
        this.properties.equations.push({
            variable: '',
            formula: ''
        })
    }

    onRemoveEquation(i: number) {
        this.properties.equations.splice(i, 1);
    }

    onSave() {
        this.item.changed = true;
    }
}
