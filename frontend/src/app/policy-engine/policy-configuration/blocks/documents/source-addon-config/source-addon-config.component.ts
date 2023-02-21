import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel, SchemaVariables } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'sendToGuardian' type.
 */
@Component({
    selector: 'source-addon-config',
    templateUrl: './source-addon-config.component.html',
    styleUrls: ['./source-addon-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class SourceAddonConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
        filtersGroup: false,
        filters: {},
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
        this.block.filters = this.block.filters || [];
        this.schemas = this.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addField() {
        this.block.filters.push({
            value: '',
            field: '',
            type: 'equal',
        })
    }
}
