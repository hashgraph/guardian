import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token, UserType } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'interfaceAction' type.
 */
@Component({
    selector: 'action-config',
    templateUrl: './action-config.component.html',
    styleUrls: ['./action-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ActionConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        optionsGroup: false,
        fileGroup: false,
        options: {},
        dropdownGroup: false
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
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.options = this.block.uiMetaData.options || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addOptions() {
        this.block.uiMetaData.options.push({
            tag: `Option_${this.block.uiMetaData.options.length}`,
            title: '',
            name: '',
            tooltip: '',
            user: UserType.OWNER,
            type: 'text',
        })
    }

    addFilters() {
        if (!this.block.filters) {
            this.block.filters = [];
        }
        this.block.filters.push({
            title: '',
            name: '',
            tooltip: '',
            type: 'text',
        })
    }
}
