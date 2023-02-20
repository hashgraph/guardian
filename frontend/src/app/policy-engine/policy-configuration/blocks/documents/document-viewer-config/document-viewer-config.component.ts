import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'interfaceDocumentsSource' type.
 */
@Component({
    selector: 'document-viewer-config',
    templateUrl: './document-viewer-config.component.html',
    styleUrls: ['./document-viewer-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class DocumentSourceComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        fieldsGroup: false,
        fields: {},
        insertGroup: false
    };

    block!: any;
    allBlocks!: any[];

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    parseField(document: any, fields: any[], prefix?: string) {
        const context = document['@context'] || "";
        const keys = Object.keys(context);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (context[key]['@context']) {
                this.parseField(context[key], fields, `${prefix}.${key}`);
            } else {
                fields.push({
                    title: prefix ? `${prefix}.${key}` : key,
                    name: prefix ? `${prefix}.${key}` : key,
                })
            }
        }
    }

    addField() {
        this.block.uiMetaData.fields.push({
            title: '',
            name: '',
            tooltip: '',
            type: 'text',
        })
    }

    load(block: PolicyBlockModel) {
        if (this.policy?.allBlocks) {
            this.allBlocks = this.policy.allBlocks;
        } else {
            this.allBlocks = [];
        }
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.fields = this.block.uiMetaData.fields || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSelectFieldType(field: any) {
        field.action = "";
        field.url = "";
        field.dialogContent = "";
        field.dialogClass = "";
        field.dialogType = "";
        field.bindBlock = "";
    }
}