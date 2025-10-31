import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, } from '@angular/core';
import {
    AbstractControl,
    UntypedFormBuilder,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import {
    DefaultFieldDictionary,
    FieldTypesDictionary,
    Schema,
    SchemaCategory,
    SchemaCondition,
    SchemaEntity,
    SchemaField,
    UnitSystem,
} from '@guardian/interfaces';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConditionControl, IfOperator } from '../condition-control';
import { FieldControl } from '../field-control';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { SchemaService } from 'src/app/services/schema.service';

enum SchemaType {
    System = 'system',
    Policy = 'policy',
    Tag = 'tag',
    Module = 'module',
    Tool = 'tool'
}

function NoBindingValidator(control: UntypedFormControl): ValidationErrors | null {
    return (control.value && control.value.length) ? null : { wrongTopicId: true };
}

/**
 * Schemas constructor
 */
@Component({
    selector: 'app-schema-configuration',
    templateUrl: './schema-configuration.component.html',
    styleUrls: ['./schema-configuration.component.scss'],
})
export class SchemaConfigurationComponent implements OnInit {
    @Input('type') type!: 'new' | 'edit' | 'version';
    @Input('policies') policies!: any[];
    @Input('tools') tools!: any[];
    @Input('schemaType') schemaType!: SchemaType;
    @Input('extended') extended!: boolean;
    @Input('properties') properties: { title: string; _id: string; value: string }[];
    @Input('subSchemas') subSchemas!: Schema[];

    @Output('init') initForm = new EventEmitter<SchemaConfigurationComponent>();
    @Output('change-form') changeForm = new EventEmitter<any>();
    @Output('use-update-sub-schemas') useUpdateSubSchemas = new EventEmitter<any>();
    public ifModeOptions = [
        { label: 'IF', value: 'SINGLE' as IfOperator },
        { label: 'IF ALL (“and”)', value: 'AND' as IfOperator },
        { label: 'IF ANY (“or”)', value: 'OR' as IfOperator }
    ];
    public started = false;
    public fields!: FieldControl[];
    public conditions!: ConditionControl[];
    public fieldsForm!: UntypedFormGroup;
    public conditionsForm!: UntypedFormGroup;
    public dataForm!: UntypedFormGroup;
    public defaultFieldsMap!: any;
    public typesMap!: any;
    public types!: any[];
    public measureTypes!: any[];
    public errors!: any[];
    public schemaTypes!: any[];
    public schemaTypeMap!: any;
    public buildField!: (fieldConfig: FieldControl, data: any) => SchemaField | null;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    private _patternByNumberType: any = {
        duration: /^[0-9]+$/,
        number: /^-?\d*(\.\d+)?$/,
        integer: /^-?\d*$/
    };
    public systemEntityOptions: { label: string; value: string }[] = [
        { label: 'STANDARD REGISTRY', value: 'STANDARD_REGISTRY' },
        { label: 'USER', value: 'USER' },
    ];
    public policyModuleEntityOptions: { label: string; value: string }[] = [
        { label: 'Default', value: 'NONE' },
        { label: 'Verifiable Credential', value: 'VC' },
        { label: 'Encrypted Verifiable Credential', value: 'EVC' },
    ];
    private _schema: Schema;
    private _topicId: string;
    private _id: string | undefined;

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

    constructor(
        private schemaService: SchemaService,
        private fb: UntypedFormBuilder
    ) {
        this.defaultFieldsMap = {};
        this.defaultFieldsMap[SchemaEntity.VC] = DefaultFieldDictionary.getDefaultFields(SchemaEntity.VC);
        this.defaultFieldsMap[SchemaEntity.EVC] = DefaultFieldDictionary.getDefaultFields(SchemaEntity.EVC);
        this.types = [];
        this.measureTypes = [];
        this.schemaTypeMap = {};
        for (const type of FieldTypesDictionary.FieldTypes) {
            const typeId = this.getId('default');
            this.types.push({ name: type.name, value: typeId });
            this.schemaTypeMap[typeId] = { ...type };
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            this.schemaTypeMap[type.name] = { ...type };
        }
        this.buildField = this.buildSchemaField.bind(this);
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

    public get isNewSchema(): boolean {
        return this.type === 'new';
    }

    get currentEntity(): any {
        return this.dataForm?.get('entity')?.value;
    }

    public ngOnInit(): void {
        this.started = false;
        this.initForm.emit(this);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        this.changeForm.emit(this);
    }

    public ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    public onFilter(event: any) {
        const topicId = event.value;
        this.useUpdateSubSchemas.emit(topicId);
    }

    public setData(schema: Schema, topicId: string) {
        this._id = schema?.document?.$id;
        this._schema = schema;
        this._topicId = topicId;
    }

    public setSubSchemas(subSchemas: Schema[]) {
        this.subSchemas = [];
        this.schemaTypes = [];
        if (Array.isArray(subSchemas)) {
            for (const schema of subSchemas) {
                if (this.checkDependencies(this._id, schema)) {
                    this.subSchemas.push(schema);
                }
            }
            for (const schema of this.subSchemas) {
                const value = this.getId('schemas');
                const type = schema.topicId === this._topicId ? 'main' : 'sub';
                const name = schema.name;
                const version = schema.version ? `v${schema.version}` : '';
                const component = (schema.topicId !== this._topicId && schema.component) ? schema.component : '';
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
        if (this.fields) {
            for (const field of this.fields) {
                field.type = '';
            }
        }
    }

    public build() {
        this.buildForm();
        this.buildFieldForm();
    }

    private buildForm() {
        if (this.dataForm) {
            this.dataForm = null as any;
        }

        this.fieldsForm = this.fb.group({});
        this.conditionsForm = new UntypedFormGroup({});

        let props: any = {
            name: ['', Validators.required],
            description: [''],
            fields: this.fieldsForm,
            conditions: this.conditionsForm
        }
        if (this.isSystem) {
            props.entity = new UntypedFormControl(SchemaEntity.STANDARD_REGISTRY, Validators.required);
        } else if (this.isTag) {
            //None
        } else if (this.isModule) {
            props.entity = new UntypedFormControl(SchemaEntity.VC, Validators.required);
        } else if (this.isTool) {
            props.entity = new UntypedFormControl(SchemaEntity.VC, Validators.required);
            props.topicId = [this._topicId, NoBindingValidator];
        } else if (this.isPolicy) {
            props.entity = new UntypedFormControl(SchemaEntity.VC, Validators.required);
            props.topicId = [this._topicId];
        } else {
            props.entity = new UntypedFormControl(SchemaEntity.VC, Validators.required);
            props.topicId = [this._topicId];
        }
        this.dataForm = this.fb.group(props, {
            validators: this.fieldNameValidator()
        });
        this.dataForm.valueChanges.subscribe(() => {
            this.changeForm.emit(this);
        });
        this.fields = [];
        this.conditions = [];
        this.started = true;
    }

    private buildFieldForm() {
        if (this.isSystem) {
            this.dataForm.setValue({
                name: this._schema?.name || '',
                description: this._schema?.description || '',
                entity: this._schema?.entity || SchemaEntity.VC,
                fields: {},
                conditions: {}
            });
        } else if (this.isTag) {
            this.dataForm.setValue({
                name: this._schema?.name || '',
                description: this._schema?.description || '',
                fields: {},
                conditions: {}
            });
        } else if (this.isModule) {
            this.dataForm.setValue({
                name: this._schema?.name || '',
                description: this._schema?.description || '',
                entity: this._schema?.entity || SchemaEntity.VC,
                fields: {},
                conditions: {}
            });
        } else {
            this.dataForm.setValue({
                name: this._schema?.name || '',
                description: this._schema?.description || '',
                entity: this._schema?.entity || SchemaEntity.VC,
                topicId: this._schema?.topicId || '',
                fields: {},
                conditions: {}
            });
        }

        const fields = this._schema?.fields || [];
        const conditions = this._schema?.conditions || [];
        const errors = this._schema?.errors || [];
        const conditionsFields: string[] = [];
        conditions.forEach((item) => {
            conditionsFields.push(
                ...item.thenFields.map((thenf) => thenf.name)
            );
            conditionsFields.push(
                ...item.elseFields!.map((elsef) => elsef.name)
            );
        });

        this.updateFieldControls(fields, conditionsFields);
        this.updateConditionControls(conditions);
        this.errors = errors;
    }


    private updateFieldControls(fields: SchemaField[], conditionsFields: string[]) {
        this.fields = [];
        for (const field of fields) {
            if (field.readOnly || conditionsFields.find(elem => elem === field.name)) {
                continue;
            }
            const control = new FieldControl(
                field,
                this.getType(field),
                this.destroy$,
                this.defaultFieldsMap,
                this.dataForm?.get('entity') as UntypedFormControl,
                this.getFieldName()
            );
            control.append(this.fieldsForm);
            control.refreshType(this.types);
            this.fields.push(control);
        }
    }

    private updateConditionControls(conditions: SchemaCondition[]) {
        this.conditions = [];
        this.conditionsForm.reset();

        for (const condition of conditions) {
            const raw = (condition as any).ifCondition;
            let operator: IfOperator = 'SINGLE';
            if (raw?.OR) {
                operator = 'OR';
            } else if (raw?.AND) {
                operator = 'AND';
            }

            const cc = new ConditionControl(undefined, '', operator);
            cc.clearConditions(false);

            condition.thenFields.forEach(field => {
                const fc = new FieldControl(
                    field, this.getType(field), this.destroy$,
                    this.defaultFieldsMap, this.dataForm?.get('entity') as UntypedFormControl,
                    this.getFieldName()
                );
                fc.refreshType(this.types);
                cc.addThenControl(fc);
            });

            condition.elseFields?.forEach(field => {
                const fc = new FieldControl(
                    field, this.getType(field), this.destroy$,
                    this.defaultFieldsMap, this.dataForm?.get('entity') as UntypedFormControl,
                    this.getFieldName()
                );
                fc.refreshType(this.types);
                cc.addElseControl(fc);
            });

            this.conditions.push(cc);
            this.conditionsForm.addControl(cc.name, cc.createGroup());
        }

        const pickName = (x: any): string | undefined =>
            x?.name || x?.key || x?.controlKey?.value || x;

        conditions.forEach((condition, idx) => {
            const cc = this.conditions[idx];
            const group = this.conditionsForm.get(cc.name) as UntypedFormGroup;
            const ifGroup = group.get('ifCondition') as UntypedFormGroup;

            const raw = (condition as any).ifCondition;
            let operator: IfOperator = 'SINGLE';
            let pairs: Array<{ field: any; fieldValue: any }> = [];
            if (raw?.OR) {
                operator = 'OR'; pairs = raw.OR;
            }
            else if (raw?.AND) {
                operator = 'AND'; pairs = raw.AND;
            }
            else if (raw?.field) {
                operator = 'SINGLE'; pairs = [raw];
            }
            (ifGroup.get('operator') as UntypedFormControl).setValue(operator, { emitEvent: false });

            const available = new Map<string, FieldControl>();
            for (const f of this.fields) {
                const key = f.controlKey?.value;
                if (key && f.isCondition(this.schemaTypeMap)) {
                    available.set(key, f);
                }
            }
            this.conditions.forEach(other => {
                if (other === cc) return;
                for (const f of other.thenControls || []) {
                    const key = f.controlKey?.value;
                    if (key) {
                        available.set(key, f);
                    }
                }
                for (const f of other.elseControls || []) {
                    const key = f.controlKey?.value;
                    if (key) {
                        available.set(key, f);
                    }
                }
            });

            cc.clearConditions(false);
            pairs.forEach(p => {
                const fieldName = pickName(p.field);
                const fc = fieldName ? available.get(fieldName) : undefined;
                cc.addCondition(fc, p.fieldValue);
                const row = cc.conditions.at(cc.conditions.length - 1) as UntypedFormGroup;
                const valueCtrl = row.get('fieldValue') as UntypedFormControl;
                if (fc) {
                    this.ifFormatValueFor(valueCtrl, fc);
                }
            });
        });
    }


    public onIfModeChange(condition: ConditionControl) {
        condition.normalizeByOperator();
    }
    public getRowFieldControl(row: UntypedFormGroup): UntypedFormControl {
        return row.get('field') as UntypedFormControl;
    }

    public getRowValueControl(row: UntypedFormGroup): UntypedFormControl {
        return row.get('fieldValue') as UntypedFormControl;
    }

    public onIfRowAdd(condition: ConditionControl) {
        condition.addCondition(undefined, '');
    }
    public onIfRowRemove(condition: ConditionControl, idx: number) {
        condition.removeCondition(idx);
    }

    public onIfRowFieldChange(condition: ConditionControl, idx: number, event: any) {
        const row = condition.conditions.at(idx) as UntypedFormGroup;
        const fieldCtrl = row.get('field') as UntypedFormControl;
        const valueCtrl = row.get('fieldValue') as UntypedFormControl;
        fieldCtrl.setValue(event.value);
        this.ifFormatValueFor(valueCtrl, event.value);
    }

    private ifFormatValueFor(valueCtrl: UntypedFormControl, field: FieldControl) {
        const type = this.schemaTypeMap[field.controlType.value];
        const isNumber = ['number', 'integer'].includes(type.type) || type.format === 'duration';

        const validators = [];
        if (field.controlRequired.value) {
            validators.push(Validators.required);
        }
        if (isNumber) {
            validators.push(this.isNumberOrEmptyValidator());
        }

        valueCtrl.clearValidators();
        valueCtrl.setValidators(validators);

        if (['date', 'date-time', 'time'].includes(type.format)) {
            this.subscribeFormatDateValue(valueCtrl, type.format);
        } else if (isNumber) {
            this.subscribeFormatNumberValue(valueCtrl, type.format || type.type);
        }

        valueCtrl.updateValueAndValidity();
    }

    public getOperatorControl(condition: ConditionControl): UntypedFormControl {
        return (this.conditionsForm.get(condition.name) as UntypedFormGroup)
            .get('ifCondition')!
            .get('operator') as UntypedFormControl;
    }

    public getOperatorValue(condition: ConditionControl): 'SINGLE' | 'AND' | 'OR' {
        const c = this.getOperatorControl(condition);
        return (c?.value || 'SINGLE') as any;
    }

    public getIfRows(condition: ConditionControl): UntypedFormGroup[] {
        return condition.conditions.controls as UntypedFormGroup[];
    }

    public getRowField(row: UntypedFormGroup): FieldControl | null {
        return (row.get('field') as UntypedFormControl)?.value || null;
    }

    private getTypeByField(fc: FieldControl | null | undefined) {
        if (!fc) {
            return null;
        }
        const typeKey = fc.controlType?.value;
        return typeKey ? this.schemaTypeMap[typeKey] : null;
    }

    public isFieldType1(fc: FieldControl | null): boolean {
        const t = this.getTypeByField(fc);
        return !!t && t.type !== 'boolean' && !['time', 'date-time', 'date'].includes(t.format);
    }
    public isFieldType2(fc: FieldControl | null): boolean {
        const t = this.getTypeByField(fc);
        return !!t && t.type === 'string' && t.format === 'time';
    }
    public isFieldType3(fc: FieldControl | null): boolean {
        const t = this.getTypeByField(fc);
        return !!t && t.type === 'string' && t.format === 'date-time';
    }
    public isFieldType4(fc: FieldControl | null): boolean {
        const t = this.getTypeByField(fc);
        return !!t && t.type === 'string' && t.format === 'date';
    }
    public isFieldType5(fc: FieldControl | null): boolean {
        const t = this.getTypeByField(fc);
        return !!t && t.type === 'boolean';
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
                } else {
                    continue;
                }
            }
            if (option.type === field.type) {
                if (
                    ((!option.format && !field.format) ||
                        option.format === field.format) &&
                    ((!option.pattern && !field.pattern) ||
                        option.pattern === field.pattern) &&
                    ((!option.isRef && !field.isRef) ||
                        option.isRef === field.isRef)
                ) {
                    return key;
                }
            }
        }
        const stringType = this.types.find((type) => type.name === 'String')?.value;
        return (field.type === 'string' && stringType) || '';
    }

    private getFieldName(): string | undefined {
        const fieldRe = /field(\d+)/;
        let lastIndex: number = -1;

        const testMaxIndex = (f: FieldControl) => {
            let curIndex: number = -1;
            if (fieldRe.test(f.key)) {
                // @ts-ignore
                const i = parseInt(fieldRe.exec(f.key)[1], 10);
                if (i > curIndex) {
                    curIndex = i;
                }
            }

            if (fieldRe.test(f.title)) {
                // @ts-ignore
                const i = parseInt(fieldRe.exec(f.title)[1], 10);
                if (i > curIndex) {
                    curIndex = i;
                }
            }

            return curIndex;
        }

        for (const f of this.fields) {
            const curIndex = testMaxIndex(f);
            if (curIndex > lastIndex) {
                lastIndex = curIndex;
            }
        }

        for (const c of this.conditions) {
            for (const f of c.thenControls) {
                const curIndex = testMaxIndex(f);
                if (curIndex > lastIndex) {
                    lastIndex = curIndex;
                }
            }
            for (const f of c.elseControls) {
                const curIndex = testMaxIndex(f);
                if (curIndex > lastIndex) {
                    lastIndex = curIndex;
                }
            }
        }

        return `field${lastIndex + 1}`
    }

    public onConditionFieldRemove(
        condition: ConditionControl,
        conditionField: FieldControl,
        type: 'then' | 'else'
    ) {
        condition.removeControl(type, conditionField);
    }

    public onConditionFieldAdd(condition: ConditionControl, type: 'then' | 'else') {
        const field = new FieldControl(
            null,
            this.getType(null),
            this.destroy$,
            this.defaultFieldsMap,
            this.dataForm?.get('entity') as UntypedFormControl,
            this.getFieldName()
        );
        condition.addControl(type, field);
    }

    public onConditionAdd() {
        const condition = new ConditionControl(undefined, '', 'SINGLE');
        this.conditions.push(condition);
        this.conditionsForm.addControl(condition.name, condition.createGroup());
    }

    public onConditionRemove(condition: ConditionControl) {
        this.conditions = this.conditions.filter((e) => e != condition);
        this.conditionsForm.removeControl(condition.name);
    }

    public onAdd(event: MouseEvent) {
        event.preventDefault();
        const control = new FieldControl(
            null,
            this.getType(null),
            this.destroy$,
            this.defaultFieldsMap,
            this.dataForm?.get('entity') as UntypedFormControl,
            this.getFieldName()
        );
        control.append(this.fieldsForm);
        this.fields.push(control);
        this.fields = this.fields.slice();
    }

    public onRemove(item: FieldControl) {
        this.removeConditionsByField(item);
        this.fields = this.fields.filter((e) => e != item);
        item.remove(this.fieldsForm);
    }

    private removeConditionsByField(field: FieldControl) {
        const conditionsToRemove = this.conditions.filter((item) => {
            return item.field.value === field;
        });
        for (const condition of conditionsToRemove) {
            this.conditions = this.conditions.filter((e) => e != condition);
            this.conditionsForm.removeControl(condition.name);
        }
    }

    private isNotEmpty(value: any) {
        return !['', undefined, null].includes(value);
    }

    public buildSchemaField(fieldConfig: FieldControl, data: any): SchemaField | null {
        const metadata = fieldConfig.getValue(data);
        if (!metadata) {
            return null;
        }
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
            availableOptionsArray,
            textColor,
            textSize,
            textBold,
            isPrivate,
            pattern,
            hidden,
            property,
            default: defaultValueRaw,
            suggest,
            example,
            autocalculate,
            expression
        } = metadata;
        const type = this.schemaTypeMap[typeIndex];
        let suggestValue;
        let defaultValue;
        let exampleValue;
        if (isArray) {
            if (Array.isArray(suggest)) {
                if (suggest.length > 0) {
                    suggestValue = suggest.filter(this.isNotEmpty)
                } else {
                    suggestValue = undefined;
                }
            } else {
                if (this.isNotEmpty(suggest)) {
                    suggestValue = [suggest];
                } else {
                    suggestValue = undefined;
                }
            }
            if (Array.isArray(defaultValueRaw)) {
                if (defaultValueRaw.length > 0) {
                    defaultValue = defaultValueRaw.filter(this.isNotEmpty)
                } else {
                    defaultValue = undefined;
                }
            } else {
                if (this.isNotEmpty(defaultValueRaw)) {
                    defaultValue = [defaultValueRaw];
                } else {
                    defaultValue = undefined;
                }
            }
            if (Array.isArray(example)) {
                if (example.length > 0) {
                    exampleValue = example.filter(this.isNotEmpty)
                } else {
                    exampleValue = undefined;
                }
            } else {
                if (this.isNotEmpty(example)) {
                    exampleValue = [example];
                } else {
                    exampleValue = undefined;
                }
            }
        } else {
            if (Array.isArray(suggest)) {
                suggestValue = suggest[0];
            } else {
                suggestValue = suggest;
            }
            if (Array.isArray(defaultValueRaw)) {
                defaultValue = defaultValueRaw[0];
            } else {
                defaultValue = defaultValueRaw;
            }
            if (Array.isArray(example)) {
                exampleValue = example[0];
            } else {
                exampleValue = example;
            }
        }
        return {
            autocalculate,
            expression,
            name: key,
            title,
            description,
            required,
            isArray,
            isRef: type?.isRef,
            fields: this.subSchemas.find((schema) => schema.iri === type?.type)?.fields || [],
            type: type?.type,
            format: type?.format,
            pattern: type?.pattern || pattern,
            unit: type?.unitSystem ? unit : undefined,
            unitSystem: type?.unitSystem,
            customType: type?.customType,
            textColor,
            textSize,
            textBold,
            hidden,
            property,
            readOnly: false,
            remoteLink: type?.customType === 'enum' ? remoteLink : undefined,
            enum: type?.customType === 'enum' && !remoteLink ? enumArray : undefined,
            availableOptions: availableOptionsArray || type?.availableOptions,
            isPrivate: this.dataForm.value?.entity === SchemaEntity.EVC ? isPrivate : undefined,
            default: defaultValue,
            suggest: suggestValue,
            examples: this.isNotEmpty(exampleValue) ? [exampleValue] : undefined,
        };
    }

    private buildSchema(value: any) {
        const schema = new Schema(this._schema);

        schema.name = value.name;
        schema.description = value.description;
        schema.entity = value.entity;

        const fields: SchemaField[] = [];
        const allFieldsByName = new Map<string, SchemaField>();

        const fieldsWithNames: { field: SchemaField; name: string }[] = [];
        for (const fieldConfig of this.fields) {
            const schemaField = this.buildSchemaField(fieldConfig, value.fields);
            if (schemaField) {
                fields.push(schemaField);
                fieldsWithNames.push({ field: schemaField, name: fieldConfig.name });
                allFieldsByName.set(fieldConfig.name, schemaField);
            }
        }

        const defaultFields = this.defaultFieldsMap[value.entity] || [];
        for (const fieldConfig of defaultFields) {
            const schemaField: SchemaField = {
                name: fieldConfig.name,
                title: fieldConfig.title,
                description: fieldConfig.description,
                autocalculate: fieldConfig.autocalculate,
                expression: fieldConfig.expression,
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
                property: fieldConfig.property
            };
            fields.push(schemaField);
            allFieldsByName.set(fieldConfig.name, schemaField);
        }

        const conditionValues = value.conditions || {};
        for (const cond of this.conditions) {
            const condVal = conditionValues[cond.name];
            if (!condVal) {
                continue;
            }

            const pushBuilt = (fc: FieldControl, controlsGroup: any) => {
                const sf = this.buildSchemaField(fc, controlsGroup);
                if (sf) {
                    fields.push(sf);
                    allFieldsByName.set(fc.name, sf);
                }
            };

            for (const fc of cond.thenControls || []) {
                pushBuilt(fc, condVal.thenFieldControls);
            }
            for (const fc of cond.elseControls || []) {
                pushBuilt(fc, condVal.elseFieldControls);
            }
        }

        const conditions: SchemaCondition[] = [];
        for (const element of this.conditions) {
            const conditionValue = value.conditions[element.name];
            if (!conditionValue) {
                continue;
            }

            const thenFields: SchemaField[] = [];
            const elseFields: SchemaField[] = [];

            for (const thenField of element.thenControls) {
                const sf = allFieldsByName.get(thenField.name);
                if (sf) {
                    thenFields.push(sf);
                }
            }
            for (const elseField of element.elseControls) {
                const sf = allFieldsByName.get(elseField.name);
                if (sf) {
                    elseFields.push(sf);
                }
            }

            const op: IfOperator = conditionValue.ifCondition?.operator || 'SINGLE';
            const rows = (conditionValue.ifCondition?.conditions as any[]) || [];
            if (!rows.length) {
                continue;
            }

            const getPickedName = (r: any): string | undefined => {
                return r?.field?.name || r?.field?.key || r?.field?.controlKey?.value || r?.field;
            };

            if (op === 'SINGLE') {
                const row = rows[0];
                const name = getPickedName(row);
                const sf = name ? allFieldsByName.get(name) : undefined;
                if (!sf) {
                    continue;
                }

                conditions.push({
                    ifCondition: {
                        field: sf,
                        fieldValue: row.fieldValue
                    },
                    thenFields,
                    elseFields
                });
            } else {
                const arr = rows
                    .map(r => {
                        const name = getPickedName(r);
                        const sf = name ? allFieldsByName.get(name) : undefined;
                        if (!sf) {
                            return null;
                        }
                        return { field: sf, fieldValue: r.fieldValue };
                    })
                    .filter(Boolean) as { field: SchemaField; fieldValue: any }[];

                if (!arr.length) {
                    continue;
                }

                conditions.push({
                    ifCondition: op === 'AND' ? { AND: arr } : { OR: arr },
                    thenFields,
                    elseFields
                });
            }
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

    public onIfConditionFieldChange(condition: ConditionControl, event: any) {
        this.ifConditionFieldChange(condition, event.value)
    }

    public ifConditionFieldChange(condition: ConditionControl, field: FieldControl | any) {
        if (!field) {
            return;
        }
        
        if (condition.changeEvents) {
            condition.fieldValue.patchValue('', {
                emitEvent: false
            });
            condition.changeEvents.forEach((item: any) => item.unsubscribe());
        }

        condition.changeEvents = [];
        condition.changeEvents.push(
            field.controlType.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    condition.fieldValue.patchValue('', {
                        emitEvent: false
                    });
                    this.ifFormatValue(condition, field);
                })
        );
        condition.changeEvents.push(
            field.controlRequired.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    this.ifFormatValue(condition, field);
                })
        );
        condition.changeEvents.push(
            field.controlArray.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    this.ifFormatValue(condition, field);
                })
        );

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

    private subscribeFormatDateValue(control: UntypedFormControl, format: string) {
        if (format === 'date') {
            return control.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((val: any) => {
                    let momentDate = moment(val);
                    let valueToSet = '';
                    if (momentDate.isValid()) {
                        valueToSet = momentDate.format('YYYY-MM-DD');
                    }

                    control.setValue(valueToSet, {
                        emitEvent: false,
                        emitModelToViewChange: false,
                    });
                });
        }

        if (format === 'date-time') {
            return control.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((val: any) => {
                    let momentDate = moment(val);
                    let valueToSet = '';
                    if (momentDate.isValid()) {
                        momentDate.seconds(0);
                        momentDate.milliseconds(0);
                        valueToSet = momentDate.toISOString();
                    }

                    control.setValue(valueToSet, {
                        emitEvent: false,
                        emitModelToViewChange: false
                    });
                });
        }

        if (format === 'time') {
            return control.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((val: any) => {
                    let momentDate = moment(val);
                    let valueToSet = '';
                    if (momentDate.isValid()) {
                        momentDate.milliseconds(0);
                        valueToSet = momentDate.format('HH:mm:ss');
                    }

                    control.setValue(valueToSet, {
                        emitEvent: false,
                        emitModelToViewChange: false
                    });
                });
        }

        return null;
    }

    private subscribeFormatNumberValue(
        control: UntypedFormControl,
        type: string,
        pattern?: string
    ) {
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

    public getFieldsForCondition(current: ConditionControl): FieldControl[] {
        const globals = this.fields.filter(f => f.isCondition(this.schemaTypeMap));

        const fromOtherConds: FieldControl[] = [];
        for (const cond of this.conditions) {
            if (cond === current) {
                continue;
            }
            if (cond.thenControls) {
                fromOtherConds.push(...cond.thenControls);
            }
            if (cond.elseControls) {
                fromOtherConds.push(...cond.elseControls);
            }
        }

        const excludeCurrent = new Set<string>();
        if (current) {
            for (const f of current.thenControls || []) excludeCurrent.add(f.controlKey?.value);
            for (const f of current.elseControls || []) excludeCurrent.add(f.controlKey?.value);
        }

        const seen = new Set<string>();
        const result: FieldControl[] = [];

        const pushUnique = (arr: FieldControl[]) => {
            for (const f of arr) {
                const key = f?.controlKey?.value;
                if (!key) {
                    continue;
                }
                if (excludeCurrent.has(key)) {
                    continue;
                }
                if (seen.has(key)) {
                    continue;
                }
                if (!f.isCondition(this.schemaTypeMap)) {
                    continue;
                }
                seen.add(key);
                result.push(f);
            }
        };

        pushUnique(globals);
        pushUnique(fromOtherConds);

        return result;
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
        return !!type && this.schemaTypeMap[type].type === 'boolean';
    }

    private fieldNameValidator(): ValidatorFn {
        return (group: any): ValidationErrors | null => {
            const all: UntypedFormControl[] = [];
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
