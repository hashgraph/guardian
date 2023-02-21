import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token, UserType } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel, SchemaVariables } from 'src/app/policy-engine/structures';

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
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
        optionsGroup: false,
        fileGroup: false,
        options: {},
        dropdownGroup: false
    };

    block!: any;
    schemas!: SchemaVariables[];

    constructor() {
    }

    ngOnInit(): void {
        this.schemas = [];
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
        this.block.uiMetaData.options = this.block.uiMetaData.options || [];
        this.schemas = this.moduleVariables?.schemas || [];
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
