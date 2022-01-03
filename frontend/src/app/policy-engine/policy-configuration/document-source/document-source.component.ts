import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../data-source/tree-data-source';

/**
 * Settings for block of 'interfaceDocumentsSource' type.
 */
@Component({
    selector: 'document-source',
    templateUrl: './document-source.component.html',
    styleUrls: [
        './../common-properties/common-properties.component.css',
        './document-source.component.css'
    ]
})
export class DocumentSourceComponent implements OnInit {
    @Input('block') currentBlock!: BlockNode;
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('all') allBlocks!: BlockNode[];
    @Input('readonly') readonly!: boolean;

    @Output() onInit = new EventEmitter();

    propHidden: any = {
        fieldsGroup: false,
        fields: {},
        insertGroup: false,
        filtersGroup: false,
    };

    block!: BlockNode;

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

    load(block: BlockNode) {
        this.block = block;
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.filters = this.block.filters || {};
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
