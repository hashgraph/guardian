import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';
import { ChangeBlockSettingsDialog } from 'src/app/modules/policy-engine/dialogs/change-block-settings-dialog/change-block-settings-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

/**
 * Settings for block of 'requestVcDocument' type.
 */
@Component({
    selector: 'request-config',
    templateUrl: './request-config.component.html',
    styleUrls: ['./request-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class RequestConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        privateFieldsGroup: false,
        preset: false,
        presetFields: {}
    };

    properties!: any;
    schemas!: SchemaVariables[];

    presetMap: any;

    public idTypeOptions = [
        { label: 'None', value: '' },
        { label: 'DID (New DID)', value: 'DID' },
        { label: 'UUID (New UUID)', value: 'UUID' },
        { label: 'Owner (Owner DID)', value: 'OWNER' }
    ];

    public uiMetaDataTypeOptions = [
        { label: 'PAGE', value: 'page' },
        { label: 'DIALOG', value: 'dialog' }
    ];

    public editType = [
        { label: 'New', value: 'new' },
        { label: 'Edit', value: 'edit' }
    ];

    public accountTypes = [
        { label: '', value: '' },
        { label: 'Pre-set user account', value: 'preset' },
        { label: 'Current user account', value: 'current' },
    ];

    constructor(private dialogService: DialogService) {
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

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.editType = this.properties.editType || 'new';
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.uiMetaData.type = this.properties.uiMetaData.type || 'page';
        this.properties.presetFields = this.properties.presetFields || [];

        this.schemas = this.moduleVariables?.schemas || [];

        const schema = this.schemas.find(e => e.value == this.properties.schema);
        const presetSchema = this.schemas.find(e => e.value == this.properties.presetSchema);
        if (!schema || !presetSchema) {
            this.properties.presetFields = [];
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
        this.properties.presetFields = [];
        this.presetMap = [];

        const schema = this.schemas.find(e => e.value == this.properties.schema);
        const presetSchema = this.schemas.find(e => e.value == this.properties.presetSchema);

        if (schema && presetSchema) {
            if (schema.data?.fields) {
                for (const field of schema.data.fields) {
                    this.properties.presetFields.push({
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
        for (let i = 0; i < this.properties.presetFields.length; i++) {
            const f = this.properties.presetFields[i];
            f.value = dMap[f.title];
        }
    }

    onSave() {
        this.item.changed = true;
    }

    getPresetOptions() {
        return this.presetMap.map((item: any) => ({
            label: item.title,
            value: item.name,
            title: item.title
        }));
    }
}
