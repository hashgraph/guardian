import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormControl,
    FormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators
} from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DATETIME_FORMATS } from '../schema-form/schema-form.component';
import { ConditionControl } from '../condition-control';
import { FieldControl } from '../field-control';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
    FieldTypesDictionary,
    Schema,
    SchemaCategory,
    SchemaCondition,
    SchemaEntity,
    SchemaField,
    SchemaHelper,
    UnitSystem
} from '@guardian/interfaces';
import { SchemaService } from 'src/app/services/schema.service';

enum SchemaType {
    System = 'system',
    Policy = 'policy',
    Tag = 'tag',
    Module = 'module',
    Tool = 'tool'
}

/**
 * Schemas constructor
 */
@Component({
    selector: 'app-schema-configuration',
    templateUrl: './schema-configuration.component.html',
    styleUrls: ['./schema-configuration.component.css'],
    providers: [
        { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
        { provide: NGX_MAT_DATE_FORMATS, useValue: DATETIME_FORMATS }
    ]
})
export class SchemaConfigurationComponent implements OnInit {
    @Input('value') value!: Schema;
    @Input('type') type!: string;
    @Input('policies') policies!: any[];
    @Input('modules') modules!: any[];
    @Input('tools') tools!: any[];
    @Input('topicId') topicId!: any;
    @Input('schemaType') schemaType!: SchemaType;
    @Input('extended') extended!: boolean;

    @Output('change-form') changeForm = new EventEmitter<any>();
    @Output('change-fields') changeFields = new EventEmitter<any>();

    public started = false;
    public loading: boolean = true;

    public fields!: FieldControl[];
    public conditions!: ConditionControl[];

    public fieldsForm!: FormGroup;
    public conditionsForm!: FormGroup;
    public dataForm!: FormGroup;
    public defaultFieldsMap!: any;
    public typesMap!: any;
    public types!: any[];
    public measureTypes!: any[];

    public schemaTypes!: any[];
    public schemaTypeMap!: any;
    public subSchemas!: Schema[];
    public destroy$: Subject<boolean> = new Subject<boolean>();

    private _patternByNumberType: any = {
        duration: /^[0-9]+$/,
        number: /^-?\d*(\.\d+)?$/,
        integer: /^-?\d*$/
    };

    public get isSystem(): boolean {
        return this.schemaType === SchemaType.System;
    }

    public get isTag(): boolean {
        return this.schemaType === SchemaType.Tag;
    }

    public get isModule(): boolean {
        return this.schemaType === SchemaType.Module;
    }

    public get isTool(): boolean {
        return this.schemaType === SchemaType.Tool;
    }

    public get isPolicy(): boolean {
        return (
            this.schemaType !== SchemaType.System &&
            this.schemaType !== SchemaType.Tag &&
            this.schemaType !== SchemaType.Module &&
            this.schemaType !== SchemaType.Tool
        );
    }

    public get isEdit(): boolean {
        return this.type === 'version' || this.type === 'edit';
    }

    public get isNewVersion(): boolean {
        return this.type === 'version';
    }

    public get category(): SchemaCategory {
        switch (this.schemaType) {
            case SchemaType.Tag:
                return SchemaCategory.TAG;
            case SchemaType.Policy:
                return SchemaCategory.POLICY;
            case SchemaType.Module:
                return SchemaCategory.MODULE;
            case SchemaType.Tool:
                return SchemaCategory.TOOL;
            case SchemaType.System:
                return SchemaCategory.SYSTEM;
            default:
                return SchemaCategory.POLICY;
        }
    }

    constructor(
        private schemaService: SchemaService,
        private fb: FormBuilder
    ) {
        const vcDefaultFields = [{
            name: 'policyId',
            title: 'Policy Id',
            description: 'Policy Id',
            required: true,
            isArray: false,
            isRef: false,
            type: 'string',
            format: undefined,
            pattern: undefined,
            readOnly: true
        }, {
            name: 'ref',
            title: 'Relationships',
            description: 'Relationships',
            required: false,
            isArray: false,
            isRef: false,
            type: 'string',
            format: undefined,
            pattern: undefined,
            readOnly: true
        }];
        this.defaultFieldsMap = {};
        this.defaultFieldsMap[SchemaEntity.VC] = vcDefaultFields;
        this.defaultFieldsMap[SchemaEntity.EVC] = vcDefaultFields;
        this.types = [];
        this.measureTypes = [];
        this.schemaTypeMap = {};
        for (const type of FieldTypesDictionary.FieldTypes) {
            const value = this.getId('default');
            this.types.push({ name: type.name, value: value });
            this.schemaTypeMap[value] = { ...type };
        }
        this.schemaTypeMap[UnitSystem.Postfix] = {
            name: UnitSystem.Postfix,
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: "",
            unitSystem: UnitSystem.Postfix
        };
        this.schemaTypeMap[UnitSystem.Prefix] = {
            name: UnitSystem.Prefix,
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: "",
            unitSystem: UnitSystem.Prefix
        };
        this.schemaTypeMap['hederaAccount'] = {
            name: 'hederaAccount',
            type: 'string',
            format: undefined,
            pattern: '^\\d+\\.\\d+\\.\\d+$',
            isRef: false,
            customType: 'hederaAccount'
        };
    }

    get currentEntity(): any {
        return this.dataForm?.get('entity')?.value;
    }

    public ngOnInit(): void {
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.extended && Object.keys(changes).length === 1) {
            return;
        }

        this.started = false;

        if (changes.value && Object.keys(changes).length === 1) {
            this.dataForm = null as any;
        }

        this.loading = true;
        this.updateSubSchemas(this.value?.topicId || this.topicId).then(() => {
            this.buildForm();
            if (changes.value && this.value) {
                this.updateFormControls();
            }
            this.changeForm.emit(this);
            setTimeout(() => {
                this.started = true;
            });
            setTimeout(() => {
                this.loading = false;
            }, 500);
        });
    }


    public ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private getId(type: 'default' | 'measure' | 'schemas'): string {
        switch (type) {
            case 'default':
                return String(this.types.length);
            case 'measure':
                return String(this.types.length + this.measureTypes.length);
            case 'schemas':
                return String(
                    this.types.length +
                    this.measureTypes.length +
                    this.schemaTypes.length
                );
        }
    }

    private buildForm() {
        if (this.dataForm) {
            if (this.isSystem) {
                this.dataForm.setValue({
                    name: '',
                    description: '',
                    entity: SchemaEntity.STANDARD_REGISTRY,
                    fields: {},
                    conditions: {}
                });
            } else if (this.isTag) {
                this.dataForm.setValue({
                    name: '',
                    description: '',
                    fields: {},
                    conditions: {}
                });
            } else {
                this.dataForm.setValue({
                    name: '',
                    description: '',
                    entity: SchemaEntity.VC,
                    topicId: this.topicId,
                    fields: {},
                    conditions: {}
                });
            }
        } else {
            this.fieldsForm = this.fb.group({});
            this.conditionsForm = new FormGroup({});

            let props: any;
            if (this.isSystem) {
                props = {
                    name: ['', Validators.required],
                    description: [''],
                    entity: new FormControl(SchemaEntity.STANDARD_REGISTRY, Validators.required),
                    fields: this.fieldsForm,
                    conditions: this.conditionsForm
                };
            } else if (this.isTag) {
                props = {
                    name: ['', Validators.required],
                    description: [''],
                    fields: this.fieldsForm,
                    conditions: this.conditionsForm
                };
            } else if (this.isModule) {
                props = {
                    name: ['', Validators.required],
                    description: [''],
                    entity: new FormControl(SchemaEntity.VC, Validators.required),
                    fields: this.fieldsForm,
                    conditions: this.conditionsForm
                };
            } else {
                props = {
                    name: ['', Validators.required],
                    description: [''],
                    topicId: [this.topicId, Validators.required],
                    entity: new FormControl(SchemaEntity.VC, Validators.required),
                    fields: this.fieldsForm,
                    conditions: this.conditionsForm
                };
            }
            this.dataForm = this.fb.group(props, {
                validators: this.fieldNameValidator()
            });
            this.dataForm.valueChanges.subscribe(() => {
                this.changeForm.emit(this);
            })
            this.fields = [];
            this.changeFields.emit(this.fields);
            this.conditions = [];
        }
    }

    public onFilter(event: any) {
        const topicId = event.value;
        this.loading = true;
        this.updateSubSchemas(topicId).then(() => {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        });
    }

    private updateSubSchemas(topicId?: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!topicId || topicId === 'draft') {
                this.mappingSubSchemas();
                resolve();
            }
            this.schemaService.getSubSchemas(topicId, this.category).subscribe((data) => {
                const subSchemas = SchemaHelper.map(data || []);
                this.mappingSubSchemas(subSchemas, topicId);
                resolve();
            }, (error) => {
                console.error(error);
                resolve();
            });
        })
    }

    private mappingSubSchemas(data?: Schema[], topicId?: string): void {
        this.subSchemas = [];
        this.schemaTypes = [];
        if (Array.isArray(data)) {
            const currentSchemaId = this.value?.document?.$id;
            for (const schema of data) {
                if (this.checkDependencies(currentSchemaId, schema)) {
                    this.subSchemas.push(schema);
                }
            }
            for (const schema of this.subSchemas) {
                const value = this.getId('schemas');
                const type = schema.topicId === topicId ? 'main' : 'sub';
                const name = schema.name;
                const version = schema.version ? `v${schema.version}` : '';
                const component = (schema.topicId !== topicId && schema.component) ? schema.component : '';
                let title = name;
                if (component) {
                    title = component + ': ' + title;
                }
                if (version) {
                    title = title + ` (${version})`;
                }
                this.schemaTypes.push({
                    type,
                    name,
                    version,
                    component,
                    title,
                    value
                });
                this.schemaTypeMap[value] = {
                    type: schema.iri,
                    format: undefined,
                    pattern: undefined,
                    isRef: true,
                }
            }
        }
    }

    private checkDependencies(currentSchemaId: any, schema: Schema): boolean {
        if (currentSchemaId && schema.document) {
            if (schema.document.$id === currentSchemaId) {
                return false;
            }
            if (schema.document.$defs && schema.document.$defs[currentSchemaId]) {
                return false;
            }
        }
        return true;
    }

    private updateConditionControls(conditions: SchemaCondition[]) {
        this.conditions = [];
        this.conditionsForm.reset();

        for (let index = 0; index < conditions.length; index++) {
            const condition = conditions[index];
            const fieldNameInCondition = condition.ifCondition.field.name;
            const field = this.fields.find(item => item.controlKey.value === fieldNameInCondition)
            const newCondition = new ConditionControl(
                field,
                condition.ifCondition.fieldValue
            )

            this.onIfConditionFieldChange(newCondition, newCondition.field!.value);

            condition.thenFields.forEach((field) => {
                const fieldValue = new FieldControl(
                    field,
                    this.getType(field),
                    this.destroy$,
                    this.defaultFieldsMap,
                    this.dataForm?.get('entity') as FormControl,
                    this.getFieldName()
                );
                newCondition.addThenControl(fieldValue);
            });

            condition.elseFields?.forEach((field) => {
                const fieldValue = new FieldControl(
                    field,
                    this.getType(field),
                    this.destroy$,
                    this.defaultFieldsMap,
                    this.dataForm?.get('entity') as FormControl,
                    this.getFieldName()
                );
                newCondition.addElseControl(fieldValue);
            });

            this.conditions.push(newCondition);
            this.conditionsForm.addControl(newCondition.name, newCondition.createGroup());
        }
    }

    private updateFieldControls(fields: SchemaField[], conditionsFields: string[]) {
        this.fields = [];
        this.changeFields.emit(this.fields);
        for (const field of fields) {
            if (field.readOnly || conditionsFields.find(elem => elem === field.name)) {
                continue;
            }
            const control = new FieldControl(
                field,
                this.getType(field),
                this.destroy$,
                this.defaultFieldsMap,
                this.dataForm?.get('entity') as FormControl,
                this.getFieldName()
            );
            control.append(this.fieldsForm);
            this.fields.push(control);
        }
    }

    private updateFormControls() {
        this.fieldsForm.reset();

        if (this.isSystem) {
            this.dataForm.setValue({
                name: this.value.name,
                description: this.value.description,
                entity: this.value.entity,
                fields: {},
                conditions: {}
            });
        } else if (this.isTag) {
            this.dataForm.setValue({
                name: this.value.name,
                description: this.value.description,
                fields: {},
                conditions: {}
            });
        } else if (this.isModule) {
            this.dataForm.setValue({
                name: this.value.name,
                description: this.value.description,
                entity: this.value.entity,
                fields: {},
                conditions: {}
            });
        } else {
            this.dataForm.setValue({
                name: this.value.name,
                description: this.value.description,
                entity: this.value.entity,
                topicId: this.value.topicId,
                fields: {},
                conditions: {}
            });
        }
        const fields = this.value.fields;
        const conditions = this.value.conditions || [];
        const conditionsFields: string[] = [];
        conditions.forEach(item => {
            conditionsFields.push(...item.thenFields.map(thenf => thenf.name))
            conditionsFields.push(...item.elseFields!.map(elsef => elsef.name))
        });

        this.updateFieldControls(fields, conditionsFields);
        this.updateConditionControls(conditions);
    }

    private getType(field: SchemaField | null): string {
        if (!field) {
            return this.types[0].value;
        }
        if (field.unitSystem == UnitSystem.Prefix) {
            return UnitSystem.Prefix;
        }
        if (field.unitSystem == UnitSystem.Postfix) {
            return UnitSystem.Postfix;
        }
        const keys = Object.keys(this.schemaTypeMap);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const option = this.schemaTypeMap[key];
            if (field.customType) {
                if (option.customType === field.customType) {
                    return key;
                }
                else {
                    continue;
                }
            }
            if (option.type === field.type) {
                if (
                    ((!option.format && !field.format) || (option.format === field.format)) &&
                    ((!option.pattern && !field.pattern) || (option.pattern === field.pattern)) &&
                    ((!option.isRef && !field.isRef) || (option.isRef === field.isRef))
                ) {
                    return key;
                }
            }
        }
        const stringType = this.types.find(
            (type) => type.name === 'String'
        )?.value;
        return (field.type === 'string' && stringType) || '';
    }

    private getFieldName(): string | undefined {
        const map: any = {};
        for (const f of this.fields) {
            map[f.key] = true;
        }
        for (const c of this.conditions) {
            for (const f of c.thenControls) {
                map[f.key] = true;
            }
            for (const f of c.elseControls) {
                map[f.key] = true;
            }
        }
        for (let index = 0; index < 1000; index++) {
            const element = `field${index}`;
            if (!map[element]) {
                return element;
            }
        }
        return undefined;
    }

    public onConditionFieldRemove(condition: ConditionControl, conditionField: FieldControl, type: 'then' | 'else') {
        condition.removeControl(type, conditionField);
    }

    public onConditionFieldAdd(condition: ConditionControl, type: 'then' | 'else') {
        const field = new FieldControl(null,
            this.getType(null),
            this.destroy$,
            this.defaultFieldsMap,
            this.dataForm?.get('entity') as FormControl,
            this.getFieldName()
        );
        condition.addControl(type, field);
    }

    public onConditionAdd() {
        const condition = new ConditionControl(undefined, '');
        this.conditions.push(condition);
        this.conditionsForm.addControl(condition.name, condition.createGroup());
    }

    public onConditionRemove(condition: ConditionControl) {
        this.conditions = this.conditions.filter(e => e != condition);
        this.conditionsForm.removeControl(condition.name);
    }

    public onAdd(event: MouseEvent) {
        event.preventDefault();
        const control = new FieldControl(
            null,
            this.getType(null),
            this.destroy$,
            this.defaultFieldsMap,
            this.dataForm?.get('entity') as FormControl,
            this.getFieldName()
        );
        control.append(this.fieldsForm)
        this.fields.push(control);
        this.fields = this.fields.slice();
        this.changeFields.emit(this.fields);
    }

    public onRemove(item: FieldControl) {
        this.removeConditionsByField(item);
        this.fields = this.fields.filter(e => e != item);
        this.changeFields.emit(this.fields);
        item.remove(this.fieldsForm);
    }

    private removeConditionsByField(field: FieldControl) {
        const conditionsToRemove = this.conditions.filter(item => {
            return item.field.value === field;
        });
        for (const condition of conditionsToRemove) {
            this.conditions = this.conditions.filter(e => e != condition);
            this.conditionsForm.removeControl(condition.name);
        }
    }

    private buildSchemaField(fieldConfig: FieldControl, data: any): SchemaField {
        const {
            key,
            title,
            description,
            typeIndex,
            required,
            isArray,
            unit,
            remoteLink,
            enumArray,
            textColor,
            textSize,
            textBold,
            isPrivate,
            pattern,
            hidden
        } = fieldConfig.getValue(data);
        const type = this.schemaTypeMap[typeIndex];
        return {
            name: key,
            title: title,
            description: description,
            required: required,
            isArray: isArray,
            isRef: type.isRef,
            type: type.type,
            format: type.format,
            pattern: type.pattern || pattern,
            unit: type.unitSystem ? unit : undefined,
            unitSystem: type.unitSystem,
            customType: type.customType,
            textColor,
            textSize,
            textBold,
            hidden,
            readOnly: false,
            remoteLink: type.customType === 'enum' ? remoteLink : undefined,
            enum:
                type.customType === 'enum' && !remoteLink
                    ? enumArray
                    : undefined,
            isPrivate:
                this.dataForm.value?.entity === SchemaEntity.EVC
                    ? isPrivate
                    : undefined,
        };
    }

    private buildSchema(value: any) {
        const schema = new Schema(this.value);
        schema.name = value.name;
        schema.description = value.description;
        schema.entity = value.entity;

        const fields: SchemaField[] = [];
        const fieldsWithNames: any[] = []

        for (const fieldConfig of this.fields) {
            const schemaField = this.buildSchemaField(fieldConfig, value.fields);
            fields.push(schemaField);
            fieldsWithNames.push({
                field: schemaField,
                name: fieldConfig.name
            })
        }

        const defaultFields = this.defaultFieldsMap[value.entity] || [];
        for (let i = 0; i < defaultFields.length; i++) {
            const fieldConfig = defaultFields[i];
            const schemaField: SchemaField = {
                name: fieldConfig.name,
                title: '',
                description: '',
                required: fieldConfig.required,
                isArray: fieldConfig.isArray,
                isRef: fieldConfig.isRef,
                type: fieldConfig.type,
                format: fieldConfig.format,
                pattern: fieldConfig.pattern,
                unit: fieldConfig.unit,
                unitSystem: fieldConfig.unitSystem,
                customType: fieldConfig.customType,
                readOnly: true,
                isPrivate: fieldConfig.isPrivate,
            }
            fields.push(schemaField);
        }

        const conditions: SchemaCondition[] = [];
        for (const element of this.conditions) {
            const conditionValue = value.conditions[element.name];
            const thenFields: SchemaField[] = [];
            const elseFields: SchemaField[] = [];

            for (const thenField of element.thenControls) {
                const schemaField = this.buildSchemaField(thenField, conditionValue.thenFieldControls);
                thenFields.push(schemaField);
            }
            for (const elseField of element.elseControls) {
                const schemaField = this.buildSchemaField(elseField, conditionValue.elseFieldControls);
                elseFields.push(schemaField);
            }

            const item = fieldsWithNames.find(item => item.name === conditionValue.ifCondition.field.name);
            conditions.push({
                ifCondition: {
                    field: item.field,
                    fieldValue: conditionValue.ifCondition.fieldValue
                },
                thenFields: thenFields,
                elseFields: elseFields
            });
        }

        schema.update(fields, conditions);
        schema.updateRefs(this.subSchemas);
        return schema;
    }

    public getSchema() {
        const value = this.dataForm.value;
        const schema = this.buildSchema(value);
        schema.topicId = value.topicId;
        schema.system = this.isSystem;
        schema.active = false;
        schema.readonly = false;
        schema.category = this.isPolicy ? SchemaCategory.POLICY : (
            this.isTag ? SchemaCategory.TAG : SchemaCategory.SYSTEM
        );
        return schema;
    }

    public onIfConditionFieldChange(condition: ConditionControl, field: FieldControl) {
        if (condition.changeEvents) {
            condition.fieldValue.patchValue('', {
                emitEvent: false
            });
            condition.changeEvents.forEach((item: any) => item.unsubscribe());
        }

        condition.changeEvents = [];
        condition.changeEvents.push(field.controlType.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                condition.fieldValue.patchValue('', {
                    emitEvent: false
                });
                this.ifFormatValue(condition, field);
            }));
        condition.changeEvents.push(field.controlRequired.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.ifFormatValue(condition, field);
            }));
        condition.changeEvents.push(field.controlArray.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.ifFormatValue(condition, field);
            }));

        this.ifFormatValue(condition, field);
    }

    private ifFormatValue(condition: ConditionControl, field: FieldControl) {
        const type = this.schemaTypeMap[field.controlType.value];
        const isNumber = ['number', 'integer'].includes(type.type) || type.format === 'duration';

        const validators = [];

        if (field.controlRequired.value) {
            validators.push(Validators.required);
        }

        if (isNumber) {
            validators.push(this.isNumberOrEmptyValidator());
        }

        condition.fieldValue.clearValidators();
        condition.fieldValue.setValidators(validators);
        condition.fieldChange?.unsubscribe();

        if (type.type === 'boolean' && !field.controlRequired.value) {
            condition.field.patchValue(null);
            return;
        }

        if (['date', 'date-time'].includes(type.format)) {
            condition.fieldChange = this.subscribeFormatDateValue(condition.fieldValue, type.format);
        }
        if (isNumber) {
            condition.fieldChange = this.subscribeFormatNumberValue(condition.fieldValue, type.format || type.type);
        }

        condition.fieldValue.updateValueAndValidity();
    }

    private subscribeFormatDateValue(control: FormControl, format: string) {
        if (format === 'date') {
            return control.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((val: any) => {
                    let momentDate = moment(val);
                    let valueToSet = "";
                    if (momentDate.isValid()) {
                        valueToSet = momentDate.format("YYYY-MM-DD");
                    }

                    control.setValue(valueToSet,
                        {
                            emitEvent: false,
                            emitModelToViewChange: false
                        });
                });
        }

        if (format === 'date-time') {
            return control.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((val: any) => {
                    let momentDate = moment(val);
                    let valueToSet = "";
                    if (momentDate.isValid()) {
                        momentDate.seconds(0);
                        momentDate.milliseconds(0);
                        valueToSet = momentDate.toISOString();
                    }

                    control.setValue(valueToSet,
                        {
                            emitEvent: false,
                            emitModelToViewChange: false
                        });
                });
        }

        return null;
    }

    private subscribeFormatNumberValue(control: FormControl, type: string, pattern?: string) {
        return control.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((val: any) => {
                let valueToSet: any = val;
                try {
                    if (
                        typeof (val) === 'string'
                        && (!pattern && !this._patternByNumberType[type].test(val) || (pattern && !val?.match(pattern)))
                    ) {
                        throw new Error();
                    }
                    if (type == 'integer') {
                        valueToSet = parseInt(val);
                    }
                    if (type == 'number' || type == 'duration') {
                        valueToSet = parseFloat(val);
                    }
                } catch (error) {
                    valueToSet = null;
                }
                if (!Number.isFinite(valueToSet)) {
                    valueToSet = val;
                }
                control.setValue(valueToSet,
                    {
                        emitEvent: false,
                        emitModelToViewChange: false
                    });
            });
    }

    public isNumberOrEmptyValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (!value || typeof (value) === 'number') {
                return null;
            }
            return {
                isNotNumber: {
                    valid: false
                }
            };
        };
    }

    public getFieldsForCondition(): FieldControl[] {
        return this.fields.filter(item => item.isCondition(this.schemaTypeMap));
    }

    public isValid(): boolean {
        if (this.dataForm) {
            return this.dataForm.valid;
        }
        return false;
    }

    public isConditionType1(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.type;
        return (
            !!type &&
            'boolean' !== this.schemaTypeMap[type].type &&
            !['time', 'date-time', 'date'].includes(this.schemaTypeMap[type].format)
        );
    }

    public isConditionType2(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.type;
        return (
            !!type &&
            this.schemaTypeMap[type].type === 'string' &&
            this.schemaTypeMap[type].format === 'time'
        );
    }

    public isConditionType3(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.type;
        return (
            !!type &&
            this.schemaTypeMap[type].type === 'string' &&
            this.schemaTypeMap[type].format === 'date-time'
        );
    }

    public isConditionType4(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.type;
        return (
            !!type &&
            this.schemaTypeMap[type].type === 'string' &&
            this.schemaTypeMap[type].format === 'date'
        );
    }

    public isConditionType5(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.type;
        return (
            !!type &&
            this.schemaTypeMap[type].type === 'boolean'
        );
    }


    private fieldNameValidator(): ValidatorFn {
        return (group: any): ValidationErrors | null => {
            const all: FormControl[] = [];
            const map: any = {};

            const fields = group.get('fields');
            const conditions = group.get('conditions');
            for (const fieldName in fields.controls) {
                const control = fields.get(fieldName).get('controlKey');
                all.push(control);
                map[control.value] = (map[control.value] || 0) + 1;
            }
            for (const conditionName in conditions.controls) {
                const control1 = conditions.get(conditionName).get('thenFieldControls');
                const control2 = conditions.get(conditionName).get('elseFieldControls');
                for (const fieldName in control1.controls) {
                    const control = control1.get(fieldName).get('controlKey');
                    all.push(control);
                    map[control.value] = (map[control.value] || 0) + 1;
                }
                for (const fieldName in control2.controls) {
                    const control = control2.get(fieldName).get('controlKey');
                    all.push(control);
                    map[control.value] = (map[control.value] || 0) + 1;
                }
            }
            let error = null;
            for (const control of all) {
                if (map[control.value] > 1) {
                    error = { unique: true };
                    control.setErrors(error);
                } else if (control.errors) {
                    delete control.errors.unique;
                    if (Object.keys(control.errors).length === 0) {
                        control.setErrors(null);
                    } else {
                        control.setErrors(control.errors);
                    }
                }
            }

            return error;
        };
    }

    public drop(event: CdkDragDrop<any[]>) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
}
