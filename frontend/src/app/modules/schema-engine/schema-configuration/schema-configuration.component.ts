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
    SchemaConditionTarget,
    SchemaEntity,
    SchemaField,
    UnitSystem,
} from '@guardian/interfaces';
import moment from 'moment';
import { merge, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConditionControl, ConditionFieldGroup, ConditionFieldOption, IfOperator } from '../condition-control';
import { FieldControl } from '../field-control';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { SchemaService } from 'src/app/services/schema.service';
import { SchemaType } from '../../policy-engine/structures/types/schema-type.type';

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
    standalone: false
})
export class SchemaConfigurationComponent implements OnInit {
    @Input('type') type!: 'new' | 'edit' | 'version';
    @Input('policies') policies!: any[];
    @Input('allPolicies') allPolicies!: any[];
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
    private _fieldOptionGroupsCache = new Map<ConditionControl, ConditionFieldGroup[]>();
    private _crossThenGroupsCache = new Map<ConditionControl, ConditionFieldGroup[]>();
    private _crossElseGroupsCache = new Map<ConditionControl, ConditionFieldGroup[]>();
    private _staleTargetKeys = new Map<ConditionControl, Set<string>>();

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

    public trackBySchemaField(index: number, field: SchemaField): string | number {
        return field?.name || index;
    }

    public trackByFieldControl(index: number, field: FieldControl): string | number {
        return field?.name || index;
    }

    public trackByCondition(index: number, condition: ConditionControl): string | number {
        return condition?.name || index;
    }

    public trackByIndex(index: number): number {
        return index;
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
                    customType: schema.topicId === this._topicId ? 'subSchema' : undefined,
                }
            }
        }
        if (this.fields) {
            for (const field of this.fields) {
                field.type = '';
            }
        }
        this.rebuildOptionCaches();
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

        const props: any = {
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
            props.topicId = [this._topicId, Validators.required];
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
        this.rebuildOptionCaches();
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
            this.watchFieldControl(control);
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
                this.watchFieldControl(fc);
            });

            condition.elseFields?.forEach(field => {
                const fc = new FieldControl(
                    field, this.getType(field), this.destroy$,
                    this.defaultFieldsMap, this.dataForm?.get('entity') as UntypedFormControl,
                    this.getFieldName()
                );
                fc.refreshType(this.types);
                cc.addElseControl(fc);
                this.watchFieldControl(fc);
            });

            (condition.thenTargets || []).forEach(target => {
                cc.addCrossThenTarget({
                    key: target.fieldPath.join('.'),
                    label: target.fieldPath.join(' > '),
                    fieldPath: target.fieldPath,
                    typeKey: this.getType(target.field),
                    required: target.field.required,
                });
            });
            (condition.elseTargets || []).forEach(target => {
                cc.addCrossElseTarget({
                    key: target.fieldPath.join('.'),
                    label: target.fieldPath.join(' > '),
                    fieldPath: target.fieldPath,
                    typeKey: this.getType(target.field),
                    required: target.field.required,
                });
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

            const availableByKey = new Map<string, FieldControl>();
            for (const f of this.fields) {
                const key = f.controlKey?.value;
                if (key && f.isCondition(this.schemaTypeMap)) {
                    availableByKey.set(key, f);
                }
            }
            this.conditions.forEach(other => {
                if (other === cc) return;
                for (const f of [...(other.thenControls || []), ...(other.elseControls || [])]) {
                    const key = f.controlKey?.value;
                    if (key) { availableByKey.set(key, f); }
                }
            });

            const buildOptionFromPredicate = (p: any): ConditionFieldOption | undefined => {
                const fp: string[] | undefined = p.fieldPath;
                if (fp != null && fp.length > 1) {
                    const leafField: SchemaField = p.field;
                    return {
                        key: fp.join('.'),
                        label: fp.join(' > '),
                        fieldPath: fp,
                        typeKey: this.getType(leafField),
                        required: leafField.required,
                    };
                }
                const fieldName = pickName(p.field);
                const fc = fieldName ? availableByKey.get(fieldName) : undefined;
                if (fc) {
                    return {
                        key: fc.controlKey.value,
                        label: fc.controlTitle.value || fc.controlKey.value,
                        fieldPath: [fc.controlKey.value],
                        typeKey: fc.controlType.value,
                        required: fc.controlRequired.value,
                        fieldControl: fc,
                    };
                }
                // Field is excluded from the IF picker but still exists — preserve the condition on round-trip.
                const fallbackFc = fieldName
                    ? this.fields.find(f => f.controlKey?.value === fieldName)
                    : undefined;
                if (!fallbackFc) { return undefined; }
                return {
                    key: fallbackFc.controlKey.value,
                    label: fallbackFc.controlTitle.value || fallbackFc.controlKey.value,
                    fieldPath: [fallbackFc.controlKey.value],
                    typeKey: fallbackFc.controlType.value,
                    required: fallbackFc.controlRequired.value,
                    fieldControl: fallbackFc,
                };
            };

            cc.clearConditions(false);
            pairs.forEach(p => {
                const opt = buildOptionFromPredicate(p);
                cc.addCondition(opt, p.fieldValue);
                const row = cc.conditions.at(cc.conditions.length - 1) as UntypedFormGroup;
                const valueCtrl = row.get('fieldValue') as UntypedFormControl;
                if (opt) {
                    this.ifFormatValueForOption(valueCtrl, opt);
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
        const opt: ConditionFieldOption = event.value;
        fieldCtrl.setValue(opt);
        this.ifFormatValueForOption(valueCtrl, opt);
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

    private getTypeByOption(opt: ConditionFieldOption | null | undefined) {
        if (!opt) { return null; }
        return opt.typeKey ? this.schemaTypeMap[opt.typeKey] : null;
    }

    public getRowOption(row: UntypedFormGroup): ConditionFieldOption | null {
        return (row.get('field') as UntypedFormControl)?.value || null;
    }

    public isFieldType1(opt: ConditionFieldOption | null): boolean {
        const t = this.getTypeByOption(opt);
        return !!t && t.type !== 'boolean' && !['time', 'date-time', 'date'].includes(t.format);
    }
    public isFieldType2(opt: ConditionFieldOption | null): boolean {
        const t = this.getTypeByOption(opt);
        return !!t && t.type === 'string' && t.format === 'time';
    }
    public isFieldType3(opt: ConditionFieldOption | null): boolean {
        const t = this.getTypeByOption(opt);
        return !!t && t.type === 'string' && t.format === 'date-time';
    }
    public isFieldType4(opt: ConditionFieldOption | null): boolean {
        const t = this.getTypeByOption(opt);
        return !!t && t.type === 'string' && t.format === 'date';
    }
    public isFieldType5(opt: ConditionFieldOption | null): boolean {
        const t = this.getTypeByOption(opt);
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
            if (field.customType && field.customType !== 'subSchema') {
                if (option.customType === field.customType) {
                    return key;
                }
                continue;
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
        this.rebuildOptionCaches();
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
        this.watchFieldControl(field);
        this.rebuildOptionCaches();
    }

    public onConditionAdd() {
        const condition = new ConditionControl(undefined, '', 'SINGLE');
        this.conditions.push(condition);
        this.conditionsForm.addControl(condition.name, condition.createGroup());
        this.rebuildOptionCaches();
    }

    public onConditionRemove(condition: ConditionControl) {
        this.conditions = this.conditions.filter((e) => e != condition);
        this.conditionsForm.removeControl(condition.name);
        this.rebuildOptionCaches();
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
        this.watchFieldControl(control);
        this.rebuildOptionCaches();
    }

    public onRemove(item: FieldControl) {
        this.removeConditionsByField(item);
        this.fields = this.fields.filter((e) => e != item);
        item.remove(this.fieldsForm);
        this.rebuildOptionCaches();
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
            enumName,
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
            expression,
            isUpdatable
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
            enumName: type?.customType === 'enum' ? enumName : undefined,
            availableOptions: availableOptionsArray || type?.availableOptions,
            isPrivate: this.dataForm.value?.entity === SchemaEntity.EVC ? isPrivate : undefined,
            default: defaultValue,
            suggest: suggestValue,
            examples: this.isNotEmpty(exampleValue) ? [exampleValue] : undefined,
            isUpdatable: isUpdatable || false,
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
                property: fieldConfig.property,
                isUpdatable: fieldConfig.isUpdatable,
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

        const fieldsBySchemaName = new Map<string, SchemaField>(fields.map(f => [f.name, f]));

        const getPickedName = (r: any): string | undefined => {
            if (Array.isArray(r?.field?.fieldPath) && r.field.fieldPath.length > 0) {
                return r.field.fieldPath[0];
            }
            if (Array.isArray(r?.fieldPath) && r.fieldPath.length > 0) {
                return r.fieldPath[0];
            }
            return r?.field?.key || r?.field?.controlKey?.value ||
                (typeof r?.field === 'string' ? r.field : undefined);
        };

        const traverseFieldPath = (path: string[]): SchemaField | undefined => {
            let current: SchemaField | undefined = fieldsBySchemaName.get(path[0]);
            for (let i = 1; i < path.length; i++) {
                if (!current?.fields) { return undefined; }
                current = current.fields.find(f => f.name === path[i]);
            }
            return current;
        };

        const startsWithArrayRefContainer = (path: string[]) => this.startsWithArrayRefContainer(path);

        const resolveIfField = (opt: ConditionFieldOption | undefined): { field: SchemaField; fieldPath?: string[] } | null => {
            if (!opt?.fieldPath?.length) { return null; }
            if (startsWithArrayRefContainer(opt.fieldPath)) { return null; }
            let leaf = traverseFieldPath(opt.fieldPath);
            if (!leaf && opt.fieldPath.length === 1 && opt.fieldControl) {
                const currentKey = opt.fieldControl.controlKey?.value;
                if (currentKey) { leaf = fieldsBySchemaName.get(currentKey); }
            }
            if (!leaf) { return null; }
            return opt.fieldPath.length === 1
                ? { field: leaf }
                : { field: leaf, fieldPath: opt.fieldPath };
        };

        const buildCrossTargets = (targets: ConditionFieldOption[]): SchemaConditionTarget[] =>
            targets.map(opt => {
                if (startsWithArrayRefContainer(opt.fieldPath)) { return null; }
                const leaf = traverseFieldPath(opt.fieldPath);
                if (!leaf) { return null; }
                return { fieldPath: opt.fieldPath, field: leaf } as SchemaConditionTarget;
            }).filter(Boolean) as SchemaConditionTarget[];

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

            const thenTargets = buildCrossTargets(element.crossThenTargets || []);
            const elseTargets = buildCrossTargets(element.crossElseTargets || []);

            const op: IfOperator = conditionValue.ifCondition?.operator || 'SINGLE';
            const rows = (conditionValue.ifCondition?.conditions as any[]) || [];
            if (!rows.length) {
                continue;
            }

            if (op === 'SINGLE') {
                const row = rows[0];
                const resolved = resolveIfField(row?.field);
                if (!resolved) {
                    const opt = row?.field as ConditionFieldOption | undefined;
                    if (opt?.fieldPath?.length && startsWithArrayRefContainer(opt.fieldPath)) {
                        console.warn(
                            `Schema condition skipped: IF trigger "${opt.fieldPath.join('.')}" ` +
                            `passes through an array-ref field and cannot be evaluated at runtime.`
                        );
                    }
                    continue;
                }
                conditions.push({
                    ifCondition: {
                        field: resolved.field,
                        fieldValue: row.fieldValue,
                        ...(resolved.fieldPath ? { fieldPath: resolved.fieldPath } : {})
                    } as any,
                    thenFields,
                    elseFields,
                    thenTargets: thenTargets.length ? thenTargets : undefined,
                    elseTargets: elseTargets.length ? elseTargets : undefined,
                });
            } else {
                const arr = rows
                    .map(r => {
                        const resolved = resolveIfField(r?.field);
                        if (!resolved) { return null; }
                        const pred: any = { field: resolved.field, fieldValue: r.fieldValue };
                        if (resolved.fieldPath) { pred.fieldPath = resolved.fieldPath; }
                        return pred;
                    })
                    .filter(Boolean);

                if (!arr.length) {
                    continue;
                }

                conditions.push({
                    ifCondition: op === 'AND' ? { AND: arr } : { OR: arr },
                    thenFields,
                    elseFields,
                    thenTargets: thenTargets.length ? thenTargets : undefined,
                    elseTargets: elseTargets.length ? elseTargets : undefined,
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
        if (!this.dataForm?.valid) { return false; }
        return !this._hasStaleConditionSelections();
    }

    private startsWithArrayRefContainer(path: string[]): boolean {
        if (path.length <= 1) { return false; }
        const key = path[0];
        const isArrayRef = (fc: FieldControl) =>
            fc.controlKey?.value === key &&
            !!fc.controlArray?.value &&
            !!this.schemaTypeMap[fc.controlType?.value]?.isRef;
        if (this.fields.some(isArrayRef)) { return true; }
        for (const cond of this.conditions) {
            if ([...(cond.thenControls || []), ...(cond.elseControls || [])].some(isArrayRef)) {
                return true;
            }
        }
        if (path.length >= 2) {
            const getSubFields = (typeKey: string): SchemaField[] | undefined => {
                const info = this.schemaTypeMap[typeKey];
                if (!info?.isRef) { return undefined; }
                return this.subSchemas?.find(s => s.iri === info.type)?.fields;
            };
            const findFc = (): FieldControl | undefined => {
                const inFields = this.fields.find(fc => fc.controlKey?.value === key);
                if (inFields) { return inFields; }
                for (const cond of this.conditions) {
                    const found = [...(cond.thenControls || []), ...(cond.elseControls || [])]
                        .find(fc => fc.controlKey?.value === key);
                    if (found) { return found; }
                }
                return undefined;
            };
            let currentFields = getSubFields(findFc()?.controlType?.value ?? '');
            for (let i = 1; i < path.length; i++) {
                if (!currentFields) { break; }
                const field = currentFields.find(f => f.name === path[i]);
                if (!field) { break; }
                if (field.isArray) { return true; }
                currentFields = getSubFields(this.getType(field));
            }
        }
        return false;
    }

    private _hasStaleConditionSelections(): boolean {
        const validRefKeys = new Set(
            this.getAllRefControls().map(fc => fc.controlKey?.value).filter(Boolean)
        );
        for (const condition of (this.conditions || [])) {
            const groups = this._fieldOptionGroupsCache.get(condition) ?? [];
            const validKeys = new Set(groups.flatMap(g => g.items.map(i => i.key)));
            for (let i = 0; i < condition.conditions.length; i++) {
                const row = condition.conditions.at(i) as UntypedFormGroup;
                const opt: ConditionFieldOption = (row.get('field') as UntypedFormControl)?.value;
                if (!opt) { continue; }
                if (opt.fieldPath?.length > 0 && this.startsWithArrayRefContainer(opt.fieldPath)) { return true; }
                const isStale = opt.fieldControl
                    ? opt.fieldControl.controlKey?.value !== opt.key
                    : (opt.fieldPath?.length > 1)
                        ? !validRefKeys.has(opt.fieldPath[0])
                        : !validKeys.has(opt.key);
                if (isStale) { return true; }
            }
            for (const t of [...condition.crossThenTargets, ...condition.crossElseTargets]) {
                if (!t.fieldPath?.length) { return true; }
                const refKey = t.fieldPath[0];
                if (validRefKeys.has(refKey)) { continue; }
                // type='' is a transient setSubSchemas reset; form required validator blocks save independently.
                const isTransient = this.fields?.some(
                    fc => fc.controlKey?.value === refKey && fc.controlType?.value === ''
                );
                if (!isTransient) { return true; }
            }
        }
        return false;
    }

    public isConditionType1(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.typeKey;
        return (
            !!type &&
            'boolean' !== this.schemaTypeMap[type]?.type &&
            !['time', 'date-time', 'date'].includes(this.schemaTypeMap[type]?.format)
        );
    }

    public isConditionType2(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.typeKey;
        return (
            !!type &&
            this.schemaTypeMap[type]?.type === 'string' &&
            this.schemaTypeMap[type]?.format === 'time'
        );
    }

    public isConditionType3(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.typeKey;
        return (
            !!type &&
            this.schemaTypeMap[type]?.type === 'string' &&
            this.schemaTypeMap[type]?.format === 'date-time'
        );
    }

    public isConditionType4(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.typeKey;
        return (
            !!type &&
            this.schemaTypeMap[type]?.type === 'string' &&
            this.schemaTypeMap[type]?.format === 'date'
        );
    }

    public isConditionType5(condition: ConditionControl): boolean {
        const type = condition.fieldControl?.typeKey;
        return !!type && this.schemaTypeMap[type]?.type === 'boolean';
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

    private ifFormatValueForOption(valueCtrl: UntypedFormControl, opt: ConditionFieldOption | null) {
        if (!opt?.typeKey) { return; }
        const type = this.schemaTypeMap[opt.typeKey];
        if (!type) { return; }
        const isNumber = ['number', 'integer'].includes(type.type) || type.format === 'duration';
        const validators = [];
        if (opt.required) { validators.push(Validators.required); }
        if (isNumber) { validators.push(this.isNumberOrEmptyValidator()); }
        valueCtrl.clearValidators();
        valueCtrl.setValidators(validators);
        if (['date', 'date-time'].includes(type.format)) {
            this.subscribeFormatDateValue(valueCtrl, type.format);
        }
        if (isNumber) {
            this.subscribeFormatNumberValue(valueCtrl, type.format || type.type);
        }
        valueCtrl.updateValueAndValidity();
    }

    private getAllRefControls(): FieldControl[] {
        const seen = new Set<string>();
        const result: FieldControl[] = [];
        const add = (fc: FieldControl) => {
            const typeKey = fc.controlType?.value;
            if (!this.schemaTypeMap[typeKey]?.isRef) { return; }
            if (fc.controlArray?.value) { return; }
            const key = fc.controlKey?.value;
            if (!key || seen.has(key)) { return; }
            seen.add(key);
            result.push(fc);
        };
        for (const fc of this.fields) { add(fc); }
        for (const cond of this.conditions) {
            for (const fc of [...(cond.thenControls || []), ...(cond.elseControls || [])]) {
                add(fc);
            }
        }
        return result;
    }

    private collectNestedFieldGroups(
        fields: SchemaField[],
        prefix: string[],
        labelPrefix: string,
        alreadySelected?: Set<string>,
        maxDepth: number = 12,
    ): ConditionFieldGroup[] {
        if (prefix.length > maxDepth) { return []; }
        const groups: ConditionFieldGroup[] = [];
        const directItems: ConditionFieldOption[] = [];

        for (const f of fields) {
            if (f.readOnly) { continue; }
            if (f.isRef) {
                if (f.isArray) { continue; }
                const nestedSchema = this.subSchemas?.find(s => s.iri === f.type);
                if (!nestedSchema?.fields?.length) { continue; }
                groups.push(...this.collectNestedFieldGroups(
                    nestedSchema.fields,
                    [...prefix, f.name],
                    `${labelPrefix} > ${f.title || f.name}`,
                    alreadySelected,
                    maxDepth,
                ));
            } else {
                if (f.isArray) { continue; }
                const leafTypeKey = this.getType(f);
                if (!leafTypeKey || !this.schemaTypeMap[leafTypeKey]) { continue; }
                const path = [...prefix, f.name];
                if (alreadySelected?.has(path.join('.'))) { continue; }
                directItems.push({
                    key: path.join('.'),
                    label: f.title || f.name,
                    shortLabel: f.title || f.name,
                    fieldPath: path,
                    typeKey: leafTypeKey,
                    required: f.required,
                });
            }
        }

        if (directItems.length) {
            groups.unshift({ label: labelPrefix, items: directItems });
        }
        return groups;
    }

    private computeFieldOptionGroups(condition: ConditionControl): ConditionFieldGroup[] {
        const groups: ConditionFieldGroup[] = [];

        const topItems: ConditionFieldOption[] = [];
        for (const fc of this.fields) {
            if (!fc.isCondition(this.schemaTypeMap)) { continue; }
            topItems.push({
                key: fc.controlKey.value,
                label: fc.controlTitle.value || fc.controlKey.value,
                fieldPath: [fc.controlKey.value],
                typeKey: fc.controlType.value,
                required: fc.controlRequired.value,
                fieldControl: fc,
            });
        }
        for (const cond of this.conditions) {
            if (cond === condition) { continue; }
            for (const fc of [...(cond.thenControls || []), ...(cond.elseControls || [])]) {
                if (!fc.isCondition(this.schemaTypeMap)) { continue; }
                topItems.push({
                    key: fc.controlKey.value,
                    label: fc.controlTitle.value || fc.controlKey.value,
                    fieldPath: [fc.controlKey.value],
                    typeKey: fc.controlType.value,
                    required: fc.controlRequired.value,
                    fieldControl: fc,
                });
            }
        }
        if (topItems.length) { groups.push({ label: 'This Schema', items: topItems }); }

        for (const fc of this.getAllRefControls()) {
            const typeKey = fc.controlType?.value;
            const type = this.schemaTypeMap[typeKey];
            const subSchema = this.subSchemas?.find(s => s.iri === type.type);
            if (!subSchema?.fields?.length) { continue; }
            const groupLabel = fc.controlTitle.value || fc.controlKey.value;
            groups.push(...this.collectNestedFieldGroups(
                subSchema.fields,
                [fc.controlKey.value],
                groupLabel,
            ));
        }

        return groups;
    }

    private computeCrossGroups(condition: ConditionControl, type: 'then' | 'else'): ConditionFieldGroup[] {
        const alreadySelected = new Set<string>(
            (type === 'then' ? condition.crossThenTargets : condition.crossElseTargets)
                .map(t => t.fieldPath.join('.'))
        );

        const groups: ConditionFieldGroup[] = [];
        for (const fc of this.getAllRefControls()) {
            const typeKey = fc.controlType?.value;
            const schemaType = this.schemaTypeMap[typeKey];
            const subSchema = this.subSchemas?.find(s => s.iri === schemaType.type);
            if (!subSchema?.fields?.length) { continue; }
            const groupLabel = fc.controlTitle.value || fc.controlKey.value;
            groups.push(...this.collectNestedFieldGroups(
                subSchema.fields,
                [fc.controlKey.value],
                groupLabel,
                alreadySelected,
            ));
        }
        return groups;
    }

    private watchFieldControl(fc: FieldControl): void {
        merge(
            fc.controlType.valueChanges,
            fc.controlArray.valueChanges,
            fc.controlKey.valueChanges,
            fc.controlTitle.valueChanges,
        )
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.rebuildOptionCaches());
    }

    private rebuildOptionCaches(): void {
        this._fieldOptionGroupsCache.clear();
        this._crossThenGroupsCache.clear();
        this._crossElseGroupsCache.clear();
        if (!this.conditions) { return; }
        for (const condition of this.conditions) {
            this._fieldOptionGroupsCache.set(condition, this.computeFieldOptionGroups(condition));
            this._crossThenGroupsCache.set(condition, this.computeCrossGroups(condition, 'then'));
            this._crossElseGroupsCache.set(condition, this.computeCrossGroups(condition, 'else'));
        }
        this.validateConditionFieldOptions();
    }

    private validateConditionFieldOptions(): void {
        const validRefKeys = new Set(
            this.getAllRefControls().map(fc => fc.controlKey?.value).filter(Boolean)
        );
        for (const condition of this.conditions) {
            const groups = this._fieldOptionGroupsCache.get(condition) ?? [];
            const validKeys = new Set(groups.flatMap(g => g.items.map(i => i.key)));

            for (let i = 0; i < condition.conditions.length; i++) {
                const row = condition.conditions.at(i) as UntypedFormGroup;
                const fieldCtrl = row.get('field') as UntypedFormControl;
                const opt: ConditionFieldOption = fieldCtrl?.value;
                const isArrayRef = opt?.fieldPath?.length > 0 && this.startsWithArrayRefContainer(opt.fieldPath);
                const isStale = !isArrayRef && opt && (
                    opt.fieldControl
                        ? opt.fieldControl.controlKey?.value !== opt.key
                        : (opt.fieldPath?.length > 1)
                            ? !validRefKeys.has(opt.fieldPath[0])
                            : !validKeys.has(opt.key)
                );
                if (isArrayRef) {
                    fieldCtrl.setErrors({ arrayRefTrigger: true });
                } else if (isStale) {
                    fieldCtrl.setErrors({ staleOption: true });
                } else if (fieldCtrl?.hasError('staleOption') || fieldCtrl?.hasError('arrayRefTrigger')) {
                    fieldCtrl.updateValueAndValidity({ emitEvent: false });
                }
            }

            const staleKeys = new Set<string>();
            for (const t of [...condition.crossThenTargets, ...condition.crossElseTargets]) {
                if (!t.fieldPath?.length) { staleKeys.add(t.key); continue; }
                const refKey = t.fieldPath[0];
                if (validRefKeys.has(refKey)) { continue; }
                const isTransient = this.fields?.some(
                    fc => fc.controlKey?.value === refKey && fc.controlType?.value === ''
                );
                if (!isTransient) { staleKeys.add(t.key); }
            }
            this._staleTargetKeys.set(condition, staleKeys);

            const hasStaleThen = condition.crossThenTargets.some(t => staleKeys.has(t.key));
            if (hasStaleThen) {
                condition.crossThenCount.setErrors({ staleTarget: true });
            } else if (condition.crossThenCount.hasError('staleTarget')) {
                condition.crossThenCount.updateValueAndValidity({ emitEvent: false });
            }

            const hasStaleElse = condition.crossElseTargets.some(t => staleKeys.has(t.key));
            if (hasStaleElse) {
                condition.crossElseCount.setErrors({ staleTarget: true });
            } else if (condition.crossElseCount.hasError('staleTarget')) {
                condition.crossElseCount.updateValueAndValidity({ emitEvent: false });
            }
        }
    }

    public isCrossTargetStale(condition: ConditionControl, target: ConditionFieldOption): boolean {
        return this._staleTargetKeys.get(condition)?.has(target.key) ?? false;
    }

    public getFieldOptionGroupsForCondition(condition: ConditionControl): ConditionFieldGroup[] {
        return this._fieldOptionGroupsCache.get(condition) ?? [];
    }

    public getCrossTargetGroupsForCondition(condition: ConditionControl, type: 'then' | 'else'): ConditionFieldGroup[] {
        const cache = type === 'then' ? this._crossThenGroupsCache : this._crossElseGroupsCache;
        return cache.get(condition) ?? [];
    }

    public onCrossTargetAdd(condition: ConditionControl, type: 'then' | 'else', event: any): void {
        if (!event?.value) { return; }
        if (type === 'then') {
            condition.addCrossThenTarget(event.value);
            this._crossThenGroupsCache.set(condition, this.computeCrossGroups(condition, 'then'));
        } else {
            condition.addCrossElseTarget(event.value);
            this._crossElseGroupsCache.set(condition, this.computeCrossGroups(condition, 'else'));
        }
    }

    public onCrossTargetRemove(condition: ConditionControl, type: 'then' | 'else', target: ConditionFieldOption): void {
        if (type === 'then') {
            condition.removeCrossThenTarget(target);
            this._crossThenGroupsCache.set(condition, this.computeCrossGroups(condition, 'then'));
        } else {
            condition.removeCrossElseTarget(target);
            this._crossElseGroupsCache.set(condition, this.computeCrossGroups(condition, 'else'));
        }
    }

    public drop(event: CdkDragDrop<any[]>) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
}
