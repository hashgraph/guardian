import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Schema, SchemaField } from 'interfaces';

/**
 * Schemes constructor
 */
@Component({
    selector: 'app-schema-configuration',
    templateUrl: './schema-configuration.component.html',
    styleUrls: ['./schema-configuration.component.css']
})
export class SchemaConfigurationComponent implements OnInit {
    @Input('schemes') schemes!: Schema[];
    @Input('value') value!: Schema;
    @Input('type') type!: string;

    started = false;
    fieldsForm!: FormGroup;
    dataForm!: FormGroup;
    defaultFields!: FormControl;
    defaultFieldsMap!: any;
    typesMap!: any;
    types!: any[];
    fields!: any[];
    schemaTypes!: any;
    schemaTypeMap!: any;

    constructor(
        private fb: FormBuilder
    ) {

        this.defaultFieldsMap = {};
        this.defaultFieldsMap["NONE"] = [];
        this.defaultFieldsMap["VC"] = [
            {
                name: 'policyId',
                description: '',
                required: true,
                isArray: false,
                isRef: false,
                type: 'string',
                format: undefined,
                pattern: undefined,
                readOnly: true
            },
            {
                name: 'ref',
                description: '',
                required: false,
                isArray: false,
                isRef: false,
                type: 'string',
                format: undefined,
                pattern: undefined,
                readOnly: true
            }
        ];
        this.defaultFieldsMap["MRV"] = [
            {
                name: 'accountId',
                description: '',
                required: true,
                isArray: false,
                isRef: false,
                type: 'string',
                format: undefined,
                pattern: undefined,
                readOnly: true
            },
            {
                name: 'policyId',
                description: '',
                required: true,
                isArray: false,
                isRef: false,
                type: 'string',
                format: undefined,
                pattern: undefined,
                readOnly: true
            }
        ];
        this.defaultFieldsMap["TOKEN"] = [];

        this.types = [
            { name: "Number", value: "1" },
            { name: "Integer", value: "2" },
            { name: "String", value: "3" },
            { name: "Boolean", value: "4" },
            { name: "Date", value: "5" },
            { name: "Time", value: "6" },
            { name: "DateTime", value: "7" },
            { name: "Duration", value: "8" },
            { name: "URL", value: "9" },
            { name: "Email", value: "10" },
            { name: "Image", value: "11" }
        ];
        this.schemaTypeMap = {};
        this.schemaTypeMap["1"] = {
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["2"] = {
            type: 'integer',
            format: undefined,
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["3"] = {
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["4"] = {
            type: 'boolean',
            format: undefined,
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["5"] = {
            type: 'string',
            format: 'date',
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["6"] = {
            type: 'string',
            format: 'time',
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["7"] = {
            type: 'string',
            format: 'date-time',
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["8"] = {
            type: 'string',
            format: 'duration',
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["9"] = {
            type: 'string',
            format: 'url',
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["10"] = {
            type: 'string',
            format: 'email',
            pattern: undefined,
            isRef: false
        };
        this.schemaTypeMap["11"] = {
            type: 'string',
            format: undefined,
            pattern: '^((https):\/\/)?ipfs.io\/ipfs\/.+',
            isRef: false
        };

        this.fieldsForm = this.fb.group({});
        this.defaultFields = new FormControl("NONE", Validators.required);
        this.dataForm = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            entity: this.defaultFields,
            fields: this.fieldsForm
        });
        this.fields = [];
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.started = true;
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.schemes) {
            this.schemaTypes = [];
            if (this.schemes) {
                for (let i = 0; i < this.schemes.length; i++) {
                    const index = String(this.types.length + i + 1);
                    this.schemaTypes.push({
                        name: this.schemes[i].name,
                        value: index
                    });
                    this.schemaTypeMap[index] = {
                        type: this.schemes[i].iri,
                        format: undefined,
                        pattern: undefined,
                        isRef: true,
                    }
                }
            }
        }
        if (changes.value) {
            if (this.value) {
                this.fieldsForm.reset();
                this.dataForm.setValue({
                    name: this.value.name,
                    description: this.value.description,
                    entity: this.value.entity,
                    fields: {}
                });
                const fields = this.value.fields;
                this.fields = [];
                for (let index = 0; index < fields.length; index++) {
                    const field = fields[index];
                    if (field.readOnly) {
                        continue;
                    }
                    const type = this.getType(field);
                    const fieldName = "fieldName" + this.fields.length;
                    const fieldType = "fieldType" + this.fields.length;
                    const fieldRequired = "fieldRequired" + this.fields.length;
                    const fieldArray = "fieldArray" + this.fields.length;
                    const controlName = new FormControl(field.description, Validators.required);
                    const controlType = new FormControl(type, Validators.required);
                    const controlRequired = new FormControl(field.required);
                    const controlArray = new FormControl(field.isArray);

                    this.fields.push({
                        name: "",
                        fieldName: fieldName,
                        fieldType: fieldType,
                        fieldRequired: fieldRequired,
                        fieldArray: fieldArray,
                        controlName: controlName,
                        controlType: controlType,
                        controlRequired: controlRequired,
                        controlArray: controlArray,
                        required: false,
                        isArray: false
                    });
                    this.fieldsForm.addControl(fieldName, controlName);
                    this.fieldsForm.addControl(fieldType, controlType);
                    this.fieldsForm.addControl(fieldRequired, controlRequired);
                    this.fieldsForm.addControl(fieldArray, controlArray);
                }
            }
        }
    }

    getType(field: SchemaField) {
        const keys = Object.keys(this.schemaTypeMap);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const option = this.schemaTypeMap[key];
            if (
                option.type == field.type &&
                option.format == field.format &&
                option.pattern == field.pattern &&
                option.isRef == field.isRef
            ) {
                return key;
            }
        }
        return null;
    }

    onAdd(event: MouseEvent) {
        event.preventDefault();

        const fieldName = "fieldName" + this.fields.length;
        const fieldType = "fieldType" + this.fields.length;
        const fieldRequired = "fieldRequired" + this.fields.length;
        const fieldArray = "fieldArray" + this.fields.length;
        const controlName = new FormControl('', Validators.required);
        const controlType = new FormControl("3", Validators.required);
        const controlRequired = new FormControl(false);
        const controlArray = new FormControl(false);
        this.fields.push({
            name: "",
            fieldName: fieldName,
            fieldType: fieldType,
            fieldRequired: fieldRequired,
            fieldArray: fieldArray,
            controlName: controlName,
            controlType: controlType,
            controlRequired: controlRequired,
            controlArray: controlArray,
            required: false,
            isArray: false
        });
        this.fieldsForm.addControl(fieldName, controlName);
        this.fieldsForm.addControl(fieldType, controlType);
        this.fieldsForm.addControl(fieldRequired, controlRequired);
        this.fieldsForm.addControl(fieldArray, controlArray);
        this.fields = this.fields.slice();
    }

    onRemove(item: any) {
        this.fields = this.fields.filter(e => e != item);
        this.fieldsForm.removeControl(item.fieldName);
        this.fieldsForm.removeControl(item.fieldType);
        this.fieldsForm.removeControl(item.fieldRequired);
        this.fieldsForm.removeControl(item.fieldArray);
    }

    public getSchema() {
        const value = this.dataForm.value;
        const schema = new Schema(this.value);
        schema.name = value.name;
        schema.description = value.description;
        schema.entity = value.entity;
        const fields: SchemaField[] = [];
        for (let i = 0; i < this.fields.length; i++) {
            const element = this.fields[i];
            const name = value.fields[element.fieldName];
            const typeIndex = value.fields[element.fieldType];
            const required = value.fields[element.fieldRequired];
            const isArray = value.fields[element.fieldArray];
            const type = this.schemaTypeMap[typeIndex];
            fields.push({
                name: name,
                title: name,
                description: name,
                required: required,
                isArray: isArray,
                isRef: type.isRef,
                type: type.type,
                format: type.format,
                pattern: type.pattern,
                readOnly: false,
            });
        }
        const defaultFields = this.defaultFieldsMap[value.entity];
        for (let i = 0; i < defaultFields.length; i++) {
            const element = defaultFields[i];
            fields.push({
                name: element.name,
                title: '',
                description: '',
                required: element.required,
                isArray: element.isArray,
                isRef: element.isRef,
                type: element.type,
                format: element.format,
                pattern: element.pattern,
                readOnly: true,
            });
        }
        schema.update(fields);
        schema.updateRefs(this.schemes);
        return schema;
    }

    public get valid() {
        return this.dataForm.valid;
    }
}
