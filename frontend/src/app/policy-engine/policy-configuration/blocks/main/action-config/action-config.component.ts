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
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        main: false,
        optionsGroup: false,
        fileGroup: false,
        options: {},
        dropdownGroup: false
    };

    properties!: any;
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
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.uiMetaData.options = this.properties.uiMetaData.options || [];
        this.schemas = this.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addOptions() {
        this.properties.uiMetaData.options.push({
            tag: `Option_${this.properties.uiMetaData.options.length}`,
            title: '',
            name: '',
            tooltip: '',
            user: UserType.OWNER,
            type: 'text',
        })
    }

    addFilters() {
        if (!this.properties.filters) {
            this.properties.filters = [];
        }
        this.properties.filters.push({
            title: '',
            name: '',
            tooltip: '',
            type: 'text',
        })
    }
    
    onSave() {
        this.item.changed = true;
    }
}
