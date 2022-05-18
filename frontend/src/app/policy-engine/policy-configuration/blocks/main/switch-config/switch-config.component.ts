import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
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
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Input('topics') topics!: any[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
    };

    block!: BlockNode;

    constructor(public registeredBlocks: RegisteredBlocks) {
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
        this.block.executionFlow = this.block.executionFlow || 'firstTrue';
        this.block.conditions = this.block.conditions || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addCondition() {
        this.block.conditions.push({
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
