import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock } from '../../../../structures';

/**
 * Settings for block of 'interfaceDocumentsSource' type.
 */
@Component({
    selector: 'document-viewer-config',
    templateUrl: './document-viewer-config.component.html',
    styleUrls: ['./document-viewer-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class DocumentSourceComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    public module: any;
    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        fieldsGroup: false,
        fields: {},
        insertGroup: false
    };

    properties!: any;
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
        this.properties.uiMetaData.fields.push({
            title: '',
            name: '',
            tooltip: '',
            type: 'text',
        })
    }

    removeField(i: number) {
        this.properties.uiMetaData.fields.splice(i, 1);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.module = this.moduleVariables?.module;
        if (this.module?.allBlocks) {
            this.allBlocks = this.module?.allBlocks;
        } else {
            this.allBlocks = [];
        }
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.uiMetaData.fields = this.properties.uiMetaData.fields || [];
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

    getFieldName(field: any, i: number): string {
        if (field && field.title) {
            return field.title;
        } else {
            return 'Field ' + i;
        }
    }

    onSave() {
        this.item.changed = true;
    }
}