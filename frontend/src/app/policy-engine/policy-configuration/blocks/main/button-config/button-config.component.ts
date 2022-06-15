import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token, UserType } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/policy-model';
import { RegisteredBlocks } from 'src/app/policy-engine/registered-blocks';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'interfaceAction' type.
 */
@Component({
    selector: 'button-config',
    templateUrl: './button-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './button-config.component.css'
    ]
})
export class ButtonConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        buttonsGroup: false,
        buttons: {}
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
        this.propHidden.buttons[this.block.uiMetaData.buttons.length-1] = {};
    }

    getIcon(block: any) {
        return this.registeredBlocks.getIcon(block.blockType);
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
