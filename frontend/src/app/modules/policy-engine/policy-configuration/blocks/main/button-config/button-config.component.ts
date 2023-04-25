import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlockModel } from '../../../../structures';

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
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        buttonsGroup: false,
        buttons: {}
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

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.uiMetaData.buttons = this.properties.uiMetaData.buttons || [];
        for (const i in this.properties.uiMetaData.buttons) {
            this.propHidden.buttons[i] = {};
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addButton() {
        this.properties.uiMetaData.buttons.push({
            tag: `Button_${this.properties.uiMetaData.buttons.length}`,
            name: '',
            type: 'selector',
            filters: []
        })
        this.propHidden.buttons[this.properties.uiMetaData.buttons.length - 1] = {};
    }

    addFilter(button: any) {
        button.filters.push({
            value: '',
            field: '',
            type: 'equal',
        })
    }

    onRemoveButton(i: number) {
        this.properties.uiMetaData.buttons.splice(i, 1);
    }

    onRemoveFilter(button: any, i: number) {
        button.filters.splice(i, 1);
    }
    
    onSave() {
        this.item.changed = true;
    }
}
