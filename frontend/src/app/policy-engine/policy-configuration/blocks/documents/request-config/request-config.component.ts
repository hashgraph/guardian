import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'requestVcDocument' type.
 */
@Component({
    selector: 'request-config',
    templateUrl: './request-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './request-config.component.css'
    ]
})
export class RequestConfigComponent implements OnInit {
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        privateFieldsGroup: false,
        preset: false,
        presetFields: {}
    };

    block!: BlockNode;

    presetMap: any;

    constructor() {
        this.presetMap = [];
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
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.type = this.block.uiMetaData.type || 'page';
        this.block.presetFields = this.block.presetFields || [];
        const schema = this.schemes.find(e => e.iri == this.block.schema);
        const presetSchema = this.schemes.find(e => e.iri == this.block.presetSchema);
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

        const schema = this.schemes.find(e => e.iri == this.block.schema);
        const presetSchema = this.schemes.find(e => e.iri == this.block.presetSchema);
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
        
        const dMap:any = {};
        for (let i = 0; i < this.presetMap.length; i++) {
            const f = this.presetMap[i];
            dMap[f.title] = f.name;
        }
        for (let i = 0; i <this.block.presetFields.length; i++) {
            const f = this.block.presetFields[i];
            f.value = dMap[f.title];
        }
    }
}
