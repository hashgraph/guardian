import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    SimpleChanges,
    ViewEncapsulation,
} from '@angular/core';
import {
    IModuleVariables,
    PolicyBlock,
    SchemaVariables,
} from '../../../../structures';

/**
 * Settings for block of 'requestVcDocumentBlockAddon' type.
 */
@Component({
    selector: 'request-addon-config',
    templateUrl: './request-addon-config.component.html',
    styleUrls: ['./request-addon-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
})
export class RequestAddonConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        preset: false,
        presetFields: {},
    };

    properties!: any;
    schemas!: SchemaVariables[];

    presetMap: any;

    public idTypeOptions = [
        { label: '', value: '' },
        { label: 'DID (New DID)', value: 'DID' },
        { label: 'UUID (New UUID)', value: 'UUID' },
        { label: 'Owner (Owner DID)', value: 'OWNER' }
    ];

    public typesOfInheritance = [
        { label: '', value: '' },
        { label: 'Inherit', value: 'inherit' },
        { label: 'Not Inherit', value: 'not_inherit' },
    ];

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

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.presetFields = this.properties.presetFields || [];

        this.schemas = this.moduleVariables?.schemas || [];

        const schema = this.schemas.find(
            (e) => e.value == this.properties.schema
        );
        const presetSchema = this.schemas.find(
            (e) => e.value == this.properties.presetSchema
        );
        if (!schema || !presetSchema) {
            this.properties.presetFields = [];
        }
        this.presetMap = [];
        if (presetSchema?.data?.fields) {
            for (const field of presetSchema.data.fields) {
                this.presetMap.push({
                    name: field.name,
                    title: field.description,
                });
            }
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSelectInput() {
        this.properties.presetFields = [];
        this.presetMap = [];

        const schema = this.schemas.find(
            (e) => e.value == this.properties.schema
        );
        const presetSchema = this.schemas.find(
            (e) => e.value == this.properties.presetSchema
        );

        if (schema && presetSchema) {
            if (schema.data?.fields) {
                for (const field of schema.data.fields) {
                    this.properties.presetFields.push({
                        name: field.name,
                        title: field.description,
                        value: null,
                        readonly: false,
                    });
                }
            }
            if (presetSchema.data?.fields) {
                this.presetMap.push({
                    name: null,
                    title: '',
                });
                for (const field of presetSchema.data.fields) {
                    this.presetMap.push({
                        name: field.name,
                        title: field.description,
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
        return this.presetMap.map((f: any) => ({
            label: f.title,
            value: f.name
        }));
    }
}
