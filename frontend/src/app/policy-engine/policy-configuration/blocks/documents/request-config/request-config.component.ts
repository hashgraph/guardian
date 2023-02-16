import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

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
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        privateFieldsGroup: false,
        preset: false,
        presetFields: {}
    };

    block!: any;

    presetMap: any;

    constructor() {
        this.presetMap = [];
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
        this.block.uiMetaData.type = this.block.uiMetaData.type || 'page';
        this.block.presetFields = this.block.presetFields || [];
        const schema = this.schemas.find(e => e.iri == this.block.schema);
        const presetSchema = this.schemas.find(e => e.iri == this.block.presetSchema);
        if (!schema || !presetSchema) {
            this.block.presetFields = [];
        }
        this.presetMap = [];
        if (presetSchema && presetSchema.fields) {
            for (let i = 0; i < presetSchema.fields.length; i++) {
                const field = presetSchema.fields[i];
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

        const schema = this.schemas.find(e => e.iri == this.block.schema);
        const presetSchema = this.schemas.find(e => e.iri == this.block.presetSchema);
        if (schema && presetSchema && schema.fields) {
            for (let i = 0; i < schema.fields.length; i++) {
                const field = schema.fields[i];
                this.block.presetFields.push({
                    name: field.name,
                    title: field.description,
                    value: null,
                    readonly: false
                })
            }
        }
        if (presetSchema && presetSchema.fields) {
            this.presetMap.push({
                name: null,
                title: ''
            });
            for (let i = 0; i < presetSchema.fields.length; i++) {
                const field = presetSchema.fields[i];
                this.presetMap.push({
                    name: field.name,
                    title: field.description
                });
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
