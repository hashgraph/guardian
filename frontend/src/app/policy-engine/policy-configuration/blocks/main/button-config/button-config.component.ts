import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'interfaceAction' type.
 */
@Component({
    selector: 'button-config',
    templateUrl: './button-config.component.html',
    styleUrls: ['./button-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ButtonConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    propHidden: any = {
        buttonsGroup: false,
        buttons: {}
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
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.buttons = this.block.uiMetaData.buttons || [];
        for (const i in this.block.uiMetaData.buttons) {
            this.propHidden.buttons[i] = {};
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addButton() {
        this.block.uiMetaData.buttons.push({
            tag: `Button_${this.block.uiMetaData.buttons.length}`,
            name: '',
            type: 'selector',
            filters: []
        })
        this.propHidden.buttons[this.block.uiMetaData.buttons.length - 1] = {};
    }

    addFilter(button: any) {
        button.filters.push({
            value: '',
            field: '',
            type: 'equal',
        })
    }

    onRemoveButton(i: number) {
        this.block.uiMetaData.buttons.splice(i, 1);
    }

    onRemoveFilter(button: any, i: number) {
        button.filters.splice(i, 1);
    }
}
