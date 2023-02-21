import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, PolicyModel, SchemaVariables } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'requestVcDocument' type.
 */
@Component({
    selector: 'request-config',
    templateUrl: './request-config.component.html',
    styleUrls: ['./request-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class RequestConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;

    propHidden: any = {
        main: false,
        privateFieldsGroup: false,
        preset: false,
        presetFields: {}
    };

    block!: any;
    schemas!: SchemaVariables[];

    presetMap: any;

    constructor() {
        this.presetMap = [];
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
        this.block.uiMetaData.type = this.block.uiMetaData.type || 'page';
        this.block.presetFields = this.block.presetFields || [];

        this.schemas = this.moduleVariables?.schemas || [];

        const schema = this.schemas.find(e => e.value == this.block.schema);
        const presetSchema = this.schemas.find(e => e.value == this.block.presetSchema);
        if (!schema || !presetSchema) {
            this.block.presetFields = [];
        }
        this.presetMap = [];
        if (presetSchema?.data?.fields) {
            for (const field of presetSchema.data.fields) {
                this.presetMap.push({
                    name: field.name,
                    title: field.description
                })
            }
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSelectInput() {
        this.block.presetFields = [];
        this.presetMap = [];

        const schema = this.schemas.find(e => e.value == this.block.schema);
        const presetSchema = this.schemas.find(e => e.value == this.block.presetSchema);

        if (schema && presetSchema) {
            if (schema.data?.fields) {
                for (const field of schema.data.fields) {
                    this.block.presetFields.push({
                        name: field.name,
                        title: field.description,
                        value: null,
                        readonly: false
                    })
                }
            }
            if (presetSchema.data?.fields) {
                this.presetMap.push({
                    name: null,
                    title: ''
                });
                for (const field of presetSchema.data.fields) {
                    this.presetMap.push({
                        name: field.name,
                        title: field.description
                    });
                }
            }
        }

        const dMap: any = {};
        for (let i = 0; i < this.presetMap.length; i++) {
            const f = this.presetMap[i];
            dMap[f.title] = f.name;
        }
        for (let i = 0; i < this.block.presetFields.length; i++) {
            const f = this.block.presetFields[i];
            f.value = dMap[f.title];
        }
    }
}
