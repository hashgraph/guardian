import { NgxMatDateAdapter, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Schema, SchemaCondition, SchemaField } from 'interfaces';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DATETIME_FORMATS } from '../schema-form/schema-form.component';

/**
 * Schemes constructor
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
    @Input('schemes') schemes!: Schema[];
    @Input('value') value!: Schema;
    @Input('type') type!: string;

    started = false;
    fieldsForm!: FormGroup;
    conditionsForm!: FormGroup;
    dataForm!: FormGroup;
    defaultFields!: FormControl;
    defaultFieldsMap!: any;
    typesMap!: any;
    types!: any[];
    fields!: any[];
    conditions!: any[];
    schemaTypes!: any;
    schemaTypeMap!: any;
    destroy$: Subject<boolean> = new Subject<boolean>();

    private _patternByNumberType: any = {
        duration: /^[0-9]+$/,
        number: /^-?\d*(\.\d+)?$/,
        integer: /^-?\d*$/
    };

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
        this.conditionsForm = new FormGroup({});
        this.defaultFields = new FormControl("NONE", Validators.required);
        this.dataForm = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            entity: this.defaultFields,
            fields: this.fieldsForm,
            conditions: this.conditionsForm
        });
        this.fields = [];
        this.conditions = [];
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
                    fields: {},
                    conditions: {}
                });
                const fields = this.value.fields;
                const conditions = this.value.conditions || [];
                this.fields = [];
                this.conditions = [];
                let conditionsFields: any[] = [];
                conditions.forEach(item=> { 
                    conditionsFields.push(...item.thenFields.map(thenf => thenf.name))
                    conditionsFields.push(...item.elseFields!.map(elsef => elsef.name))
                });

                for (let index = 0; index < fields.length; index++) {
                    const field = fields[index];
                    if (field.readOnly || conditionsFields.find(elem => elem === field.name)) {
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
                        name: field.name,
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

                for (let index = 0; index < conditions.length; index++) {
                    const condition = conditions[index];
                    const fieldNameInCondition = condition.ifCondition.field.name;
                    let newCondition: any = {
                        name: "conditionName" + index,
                        ifControl: {
                            field: new FormControl(this.fields.find(item => item.name === fieldNameInCondition), Validators.required),
                            fieldValue: new FormControl(condition.ifCondition.fieldValue, Validators.required)
                        },
                        thenControls: [],
                        elseControls: []
                    };
                    
                    this.onIfConditionFieldChange(newCondition, newCondition.ifControl.field!.value);

                    const thenFieldsControls = new FormGroup({});
                    const elseFieldsControls = new FormGroup({});

                    condition.thenFields.forEach((field: any) => {
                        const type = this.getType(field);
                        const controlName = new FormControl(field.description, Validators.required);
                        const controlType = new FormControl(type, Validators.required);
                        const controlRequired = new FormControl(field.required);
                        const controlArray = new FormControl(field.isArray);

                        const fieldValue = {
                            fieldName: field.name,
                            controlName: controlName,
                            controlType: controlType,
                            controlRequired: controlRequired,
                            controlArray: controlArray
                        }

                        thenFieldsControls.addControl(fieldValue.fieldName, new FormGroup({
                            fieldName: fieldValue.controlName,
                            fieldType: fieldValue.controlType,
                            fieldRequired: fieldValue.controlRequired,
                            fieldArray: fieldValue.controlArray
                        }));

                        newCondition.thenControls.push(fieldValue);
                    });

                    condition.elseFields?.forEach((field: any) => {
                        const type = this.getType(field);
                        const controlName = new FormControl(field.description, Validators.required);
                        const controlType = new FormControl(type, Validators.required);
                        const controlRequired = new FormControl(field.required);
                        const controlArray = new FormControl(field.isArray);

                        const fieldValue = {
                            fieldName: field.name,
                            controlName: controlName,
                            controlType: controlType,
                            controlRequired: controlRequired,
                            controlArray: controlArray
                        }

                        elseFieldsControls.addControl(fieldValue.fieldName, new FormGroup({
                            fieldName: fieldValue.controlName,
                            fieldType: fieldValue.controlType,
                            fieldRequired: fieldValue.controlRequired,
                            fieldArray: fieldValue.controlArray
                        }));

                        newCondition.elseControls.push(fieldValue);
                    });

                    const conditionForm = new FormGroup({
                        ifCondition: new FormGroup({
                            field: newCondition.ifControl.field,
                            fieldValue: newCondition.ifControl.fieldValue
                        }),
                        thenFieldControls: thenFieldsControls,
                        elseFieldControls: elseFieldsControls
                    }, this.countThenElseFieldsValidator());

                    this.conditions.push(newCondition);
                    this.conditionsForm.addControl(newCondition.name, conditionForm);
                }

            }
        }
    }

    public countThenElseFieldsValidator() : ValidatorFn {
        return (group: any): ValidationErrors | null => {
            const thenFieldControls = group.controls.thenFieldControls;
            const elseFieldControls = group.controls.elseFieldControls;
            if (Object.keys(thenFieldControls.controls).length > 0 || Object.keys(elseFieldControls.controls).length > 0) {
                return null;
            }
            return {
                noConditionFields: {
                    valid: false
                }
            };
        };
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

    onConditionFieldRemove(condition: any, conditionField: any, type: 'then' | 'else') {
        const conditionControl = this.conditionsForm.get(condition.name);

        switch (type){
            case 'then':
                (conditionControl!.get("thenFieldControls") as FormGroup).removeControl(conditionField.fieldName);
                condition.thenControls = condition.thenControls.filter((e: any) => e!==conditionField);
                break;
            case 'else':
                (conditionControl!.get("elseFieldControls") as FormGroup).removeControl(conditionField.fieldName);
                condition.elseControls = condition.elseControls.filter((e: any) => e!==conditionField);
                break;
        }
    }

    onConditionFieldAdd(condition: any, type: 'then' | 'else') {
        const conditionControl = this.conditionsForm.get(condition.name);

        const fieldName = "field" + Date.now();
        const controlName = new FormControl('', Validators.required);
        const controlType = new FormControl("3", Validators.required);
        const controlRequired = new FormControl(false);
        const controlArray = new FormControl(false);

        const field = {
            fieldName: fieldName,
            controlName: controlName,
            controlType: controlType,
            controlRequired: controlRequired,
            controlArray: controlArray
        }

        switch (type) {
            case 'then': 
                (conditionControl!.get("thenFieldControls") as FormGroup).addControl(fieldName, new FormGroup({
                    fieldName: field.controlName,
                    fieldType: field.controlType,
                    fieldRequired: field.controlRequired,
                    fieldArray: field.controlArray
                }));
        
                condition.thenControls.push(field);
                break;
            case 'else': 
                (conditionControl!.get("elseFieldControls") as FormGroup).addControl(fieldName, new FormGroup({
                    fieldName: field.controlName,
                    fieldType: field.controlType,
                    fieldRequired: field.controlRequired,
                    fieldArray: field.controlArray
                }));

                condition.elseControls.push(field);
                break;
        }
    }

    onConditionAdd() {
        const condition = {
            name: "conditionName" + this.conditions.length,
            ifControl: {
                field: new FormControl('', Validators.required),
                fieldValue: new FormControl('')
            },
            thenControls: [],
            elseControls: []
        };

        this.conditions.push(condition);

        const conditionForm = new FormGroup({
            ifCondition: new FormGroup(condition.ifControl),
            thenFieldControls: new FormGroup({}),
            elseFieldControls: new FormGroup({})
        }, this.countThenElseFieldsValidator());

        this.conditionsForm.addControl(condition.name, conditionForm);
    }

    onConditionRemove(condition: any) {
        this.conditions = this.conditions.filter(e => e != condition);
        this.conditionsForm.removeControl(condition.name);
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
        this.removeConditionsByField(item);
        this.fields = this.fields.filter(e => e != item);
        this.fieldsForm.removeControl(item.fieldName);
        this.fieldsForm.removeControl(item.fieldType);
        this.fieldsForm.removeControl(item.fieldRequired);
        this.fieldsForm.removeControl(item.fieldArray);
        
    }

    private removeConditionsByField(field: any) {
        const conditionsToRemove = this.conditions.filter(item => {
            return item.ifControl.field.value === field;
        });

        for(let i=0;i< conditionsToRemove.length;i++)
        {
            this.onConditionRemove(conditionsToRemove[i]);
        }
    }

    public getSchema() {
        const value = this.dataForm.value;
        const schema = new Schema(this.value);
        schema.name = value.name;
        schema.description = value.description;
        schema.entity = value.entity;
        const fields: SchemaField[] = [];
        const fieldsWithNames : any[] = []
        for (let i = 0; i < this.fields.length; i++) {
            const element = this.fields[i];
            const name = value.fields[element.fieldName];
            const typeIndex = value.fields[element.fieldType];
            const required = value.fields[element.fieldRequired];
            const isArray = value.fields[element.fieldArray];
            const type = this.schemaTypeMap[typeIndex];
            const field = {
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
            }
            fields.push(field);
            fieldsWithNames.push({
                field: field,
                name: element.fieldName
            })

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

        const conditions: SchemaCondition[] = [];
        for (let i = 0; i < this.conditions.length; i++) {
            const element = this.conditions[i];
            const conditionValue = value.conditions[element.name];

            const thenFields = [];
            const thenFieldsControls = conditionValue.thenFieldControls;
            const thenFieldNames = Object.keys(thenFieldsControls);
            for (let j = 0; j < thenFieldNames.length; j++) {
                const typeIndex = thenFieldsControls[thenFieldNames[j]].fieldType;
                const type = this.schemaTypeMap[typeIndex];
                const schemaField: SchemaField = {
                    name: thenFieldNames[j],
                    title: thenFieldsControls[thenFieldNames[j]].fieldName,
                    description: thenFieldsControls[thenFieldNames[j]].fieldName,
                    required: thenFieldsControls[thenFieldNames[j]].fieldRequired,
                    isArray: thenFieldsControls[thenFieldNames[j]].fieldArray,
                    isRef: type.isRef,
                    type: type.type,
                    format: type.format,
                    pattern: type.pattern,
                    readOnly: false,
                }
                thenFields.push(schemaField);
            }

            const elseFields = [];
            const elseFieldsControls = conditionValue.elseFieldControls;
            const elseFieldNames = Object.keys(elseFieldsControls);
            for (let j = 0; j < elseFieldNames.length; j++) {
                const typeIndex = elseFieldsControls[elseFieldNames[j]].fieldType;
                const type = this.schemaTypeMap[typeIndex];
                const schemaField: SchemaField = {
                    name: elseFieldNames[j],
                    title: elseFieldsControls[elseFieldNames[j]].fieldName,
                    description: elseFieldsControls[elseFieldNames[j]].fieldName,
                    required: elseFieldsControls[elseFieldNames[j]].fieldRequired,
                    isArray: elseFieldsControls[elseFieldNames[j]].fieldArray,
                    isRef: type.isRef,
                    type: type.type,
                    format: type.format,
                    pattern: type.pattern,
                    readOnly: false,
                }
                elseFields.push(schemaField);
            }

            conditions.push({
                ifCondition: {
                    field: fieldsWithNames.find(item => item.name === conditionValue.ifCondition.field.fieldName).field,
                    fieldValue: conditionValue.ifCondition.fieldValue
                },
                thenFields: thenFields,
                elseFields: elseFields
            });
        }
        schema.update(fields, conditions);
        schema.updateRefs(this.schemes);
        return schema;
    }

    public get valid() {
        return this.dataForm.valid;
    }

    onIfConditionFieldChange(condition: any, field: any) {
        if (condition.changeEvents) {
            condition.ifControl.fieldValue.patchValue('', {
                emitEvent: false
            });
        }

        condition.changeEvents?.forEach((item: any) => item.unsubscribe());
        
        condition.changeEvents = []
        condition.changeEvents.push(field.controlRequired.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.ifFormatValue(condition, field);
        }));
        condition.changeEvents.push(field.controlType.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                condition.ifControl.fieldValue.patchValue('', {
                    emitEvent: false
                });
                this.ifFormatValue(condition, field);
        }));
        condition.changeEvents.push(field.controlArray.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                condition.ifControl.field.patchValue(null);
        }));

        this.ifFormatValue(condition, field);
    }

    private ifFormatValue(condition: any, field: any) {
        const type = this.schemaTypeMap[field.controlType.value];
        const isNumber = ['number', 'integer'].includes(type.type) || type.format === 'duration';

        const validators = [];

        if (field.controlRequired.value) {
            validators.push(Validators.required);
        }

        if (isNumber) {
            validators.push(this.isNumberOrEmptyValidator());
        }
        
        (condition.ifControl.fieldValue as FormControl).clearValidators();
        (condition.ifControl.fieldValue as FormControl).setValidators(validators);
        condition.fieldChange?.unsubscribe();

        if (type.type === 'boolean' && !field.controlRequired.value) {
            (condition.ifControl.field as FormControl).patchValue(null);
            return;
        }

        if (['date', 'date-time'].includes(type.format)) {
            condition.fieldChange = this.subscribeFormatDateValue(condition.ifControl.fieldValue, type.format);
        }
        if (isNumber) {
            condition.fieldChange = this.subscribeFormatNumberValue(condition.ifControl.fieldValue, type.format || type.type);
        }

        condition.ifControl.fieldValue.updateValueAndValidity();
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
        control.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe((val: any) => {
            let valueToSet: any = val;
            try {
              if (
                typeof(val) === 'string'
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

      public isNumberOrEmptyValidator() : ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value; 
            if (!value || typeof(value) === 'number') {
                return null;
            }
            return {
                isNotNumber: {
                    valid: false
                }
            };
        };
    }

       getFieldsForCondition() {
        return this.fields.filter(item => 
            !item.controlArray.value && item.controlName.value && !this.schemaTypeMap[item.controlType.value].isRef
            && (this.schemaTypeMap[item.controlType.value].type === 'boolean' ? item.controlRequired.value : true)
        );
      }

      ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
      }
}
