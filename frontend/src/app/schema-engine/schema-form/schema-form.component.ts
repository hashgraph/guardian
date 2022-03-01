import { NgxMatDateAdapter, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Schema, SchemaCondition, SchemaField } from 'interfaces';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { API_IPFS_GATEWAY_URL } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';

export const DATETIME_FORMATS = {
    parse: {
        dateInput: 'l, LT',
    },
    display: {
        dateInput: 'l, LT',
        monthYearLabel: 'MM yyyy',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    }
};

enum PlaceholderByFieldType {
    Email = "example@email.com",
    Number = "123",
    URL = "example.com",
    String = "example string",
    IPFS = 'ipfs.io/ipfs/example-hash'
}

enum ErrorFieldMessageByFieldType {
    Email = "Please make sure the field contain a valid email address",
    Number = "Please make sure the field contain a valid number value",
    Duration = "Please make sure the field contain a valid duration value",
    Integer = "Please make sure the field contain a valid integer value",
    URL = "Please make sure the field contain a valid URL value",
    DateTime = "Please make sure the field contain a valid datetime value",
    Date = "Please make sure the field contain a valid date value",
    Other = "Please make sure the field contain a valid value"
};

enum ErrorArrayMessageByFieldType {
    Email = "Please make sure all fields contain a valid email address",
    Number = "Please make sure all fields contain a valid number value",
    Duration = "Please make sure all fields contain a valid duration value",
    Integer = "Please make sure all fields contain a valid integer value",
    URL = "Please make sure all fields contain a valid URL value",
    DateTime = "Please make sure all fields contain a valid datetime value",
    Date = "Please make sure all fields contain a valid date value",
    Other = "Please make sure all fields contain a valid value"
};

/**
 * Form built by schema
 */
@Component({
    selector: 'app-schema-form',
    templateUrl: './schema-form.component.html',
    styleUrls: ['./schema-form.component.css'],
    providers: [
        { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
        { provide: NGX_MAT_DATE_FORMATS, useValue: DATETIME_FORMATS }
    ]
})
export class SchemaFormComponent implements OnInit {
    @Input('private-fields') hide!: { [x: string]: boolean };
    @Input('schema') schema!: Schema;
    @Input('fields') schemaFields!: SchemaField[];
    @Input('context') context!: {
        type: any;
        context: any;
    };
    @Input('formGroup') group!: FormGroup;
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input('conditions') conditions: any = null;
    @Input('preset') presetDocument: any = null;

    @Output('change') change = new EventEmitter<Schema | null>();
    @Output('destroy') destroy = new EventEmitter<void>();

    destroy$: Subject<boolean> = new Subject<boolean>();
    options: FormGroup | undefined;
    fields: any[] | undefined = [];
    conditionFields: SchemaField[] = [];

    private _patternByNumberType: any = {
        duration: /^[0-9]+$/,
        number: /^-?\d*(\.\d+)?$/,
        integer: /^-?\d*$/
    };

    constructor(
        private ipfs: IPFSService,
        protected changeDetectorRef: ChangeDetectorRef
    ) { }


    ngOnInit(): void {
    }

    ngOnChanges() {
        let schemaFields: SchemaField[] | undefined = undefined;

        if (this.schema) {
            this.context = {
                type: this.schema.type,
                context: [this.schema.contextURL]
            };

            schemaFields = this.schema.fields;

            if (!this.conditions) {
                this.conditions = this.schema.conditions;
            }
        }

        if (this.schemaFields) {
            schemaFields = this.schemaFields;
        }

        this.hide = this.hide || {};
        this.conditionFields = [];

        if (this.conditions) {
            this.conditions.forEach((cond: any) => {
                cond.conditionForm = new FormGroup({});
                this.subscribeCondition(cond.conditionForm);
                this.conditionFields.push(...cond.thenFields);
                this.conditionFields.push(...cond.elseFields);
            });
        }

        this.update(schemaFields);
    }

    update(schemaFields?: SchemaField[]) {
        if (!schemaFields) {
            return;
        }
        this.options = this.group;

        const group: any = {};
        const fields: any[] = [];
        for (let i = 0; i < schemaFields.length; i++) {
            const field = schemaFields[i];
            if (this.hide[field.name] || this.conditionFields.find(elem => elem.name === field.name)) {
                continue
            }
            const item = this.createFieldControl(field);
            fields.push(item);
            if (item.control) {
                group[field.name] = item.control;
            }
        }

        this.fields = fields;

        const keys = Object.keys(group);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            this.options.removeControl(key);
            this.options.addControl(key, group[key]);
        }
        if (this.context) {
            this.options.removeControl("type");
            this.options.removeControl("@context");
            this.options.addControl("type", new FormControl(this.context.type));
            this.options.addControl("@context", new FormControl(this.context.context));
        }

        this.options?.updateValueAndValidity();
        this.changeDetectorRef.detectChanges();
    }

    private createFieldControl(field: SchemaField): any {
        const item: any = {
            name: field.name,
            description: field.description,
            required: field.required,
            isArray: field.isArray,
            isRef: field.isRef,
            context: field.context,
            type: field.type,
            format: field.format,
            pattern: field.pattern,
            conditions: field.conditions,
            hide: false
        }

        if (this.presetDocument) {
            item.preset = this.presetDocument[field.name];
        } else {
            item.preset = null;
        }

        if (!field.isArray && !field.isRef) {
            item.fileUploading = false;
            const validators = this.getValidators(item);
            item.control = new FormControl(item.preset || "", validators);
            this.postFormat(item, item.control);
        }

        if (!field.isArray && field.isRef) {
            item.fields = field.fields;
            if (field.required) {
                item.control = new FormGroup({});
            }
        }

        if (field.isArray && !field.isRef) {
            item.control = new FormArray([]);
            item.list = [];
            if (item.preset && item.preset.length) {
                for (let index = 0; index < item.preset.length; index++) {
                    const preset = item.preset[index];
                    const listItem = this.createListControl(item, preset);
                    item.list.push(listItem);
                    item.control.push(listItem.control);
                }
                this.options?.updateValueAndValidity();
                this.change.emit();
            } else if (field.required) {
                const listItem = this.createListControl(item);
                item.list.push(listItem);
                item.control.push(listItem.control);

                this.options?.updateValueAndValidity();
                this.change.emit();
            }
        }

        if (field.isArray && field.isRef) {
            item.control = new FormArray([]);
            item.list = [];
            item.fields = field.fields;
            if (item.preset && item.preset.length) {
                for (let index = 0; index < item.preset.length; index++) {
                    const preset = item.preset[index];
                    const listItem = this.createListControl(item, preset);
                    item.list.push(listItem);
                    item.control.push(listItem.control);
                }
                this.options?.updateValueAndValidity();
                this.change.emit();
            } else if (field.required) {
                const listItem = this.createListControl(item);
                item.list.push(listItem);
                item.control.push(listItem.control);

                this.options?.updateValueAndValidity();
                this.change.emit();
            }
        }

        return item;
    }

    private createListControl(item: any, preset?: any): any {
        const listItem: any = {
            name: item.name,
            preset: preset,
            index: String(item.list.length),
        }
        if (item.isRef) {
            listItem.control = new FormGroup({});
        } else {
            listItem.fileUploading = false;
            const validators = this.getValidators(item);
            listItem.control = new FormControl(preset || "", validators);
            this.postFormat(item, listItem.control);
        }

        return listItem;
    }

    private getValidators(item: any): ValidatorFn[] {
        const validators = [];

        if (item.required) {
            validators.push(Validators.required);
        }

        if (item.pattern) {
            validators.push(Validators.pattern(item.pattern));
            return validators;
        }

        if (item.format === 'email') {
            validators.push(Validators.pattern(/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/));
        }

        if (item.type === 'number') {
            validators.push(this.isNumberOrEmptyValidator());
        }

        if (item.format === 'duration') {
            validators.push(this.isNumberOrEmptyValidator());
        }

        if (item.type === 'integer') {
            validators.push(this.isNumberOrEmptyValidator());
        }

        if (item.format === 'url') {
            validators.push(Validators.pattern(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/));
        }

        return validators;
    }

    private postFormat(item: any, control: FormControl): any {
        const format = item.format;
        const type = item.type;
        const pattern = item.pattern;

        control.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((val: any) => {
                let valueToSet: any = val;
                if (format === 'date') {
                    const momentDate = moment(val);
                    if (momentDate.isValid()) {
                        valueToSet = momentDate.format("YYYY-MM-DD");
                    } else {
                        valueToSet = "";
                    }
                } else if (format === 'date-time') {
                    const momentDate = moment(val);
                    if (momentDate.isValid()) {
                        momentDate.seconds(0);
                        momentDate.milliseconds(0);
                        valueToSet = momentDate.toISOString();
                    } else {
                        valueToSet = "";
                    }
                } else if (type === 'number' || type === 'integer' || format === 'duration') {
                    if (typeof (val) === 'string') {
                        if (
                            (!pattern && !this._patternByNumberType[type].test(val)) ||
                            (pattern && !val?.match(pattern))
                        ) {
                            valueToSet = null;
                        } else if (type == 'integer') {
                            valueToSet = parseInt(val);
                        } else if (type == 'number' || type == 'duration') {
                            valueToSet = parseFloat(val);
                        }
                    }
                    if (!Number.isFinite(valueToSet)) {
                        valueToSet = val;
                    }
                } else {
                    return;
                }
                control.setValue(valueToSet, {
                    emitEvent: false,
                    emitModelToViewChange: false
                });
            });
    }

    addItem(item: any) {
        const listItem = this.createListControl(item);
        item.list.push(listItem);
        setTimeout(() => {
            item.control.push(listItem.control);
            this.options?.updateValueAndValidity();
            this.change.emit();
        });
    }

    addGroup(item: any) {
        item.control = new FormGroup({});
        this.options?.addControl(item.name, item.control);
        this.change.emit();
        this.changeDetectorRef.detectChanges();
    }

    removeGroup(item: any) {
        this.options?.removeControl(item.name);
        this.options?.updateValueAndValidity();
        item.control = null;
        this.change.emit();
    }

    removeItem(item: any, listItem: any) {
        const index = item.list.indexOf(listItem);
        item.control.removeAt(index);
        item.list.splice(index, 1);
        for (let index = 0; index < item.list.length; index++) {
            const element = item.list[index];
            element.index = String(index);
        }
        this.options?.updateValueAndValidity();
        this.change.emit();
    }


    onFileSelected(event: any, control: AbstractControl, item: any) {
        control.patchValue("");
        const file = event?.target?.files[0];

        if (!file) {
            return;
        }
        item.fileUploading = true;
        this.ipfs.addFile(file)
            .subscribe(res => {
                control.patchValue(API_IPFS_GATEWAY_URL + res);
                item.fileUploading = false;
            }, error => {
                item.fileUploading = false;
            });
    }

    GetInvalidMessageByFieldType(type: string, isArray: boolean = false): string {
        if (!type) {
            return "";
        }

        const messages = isArray
            ? ErrorArrayMessageByFieldType
            : ErrorFieldMessageByFieldType;

        switch (type) {
            case 'email':
                return messages.Email;
            case 'number':
                return messages.Number;
            case 'duration':
                return messages.Duration;
            case 'integer':
                return messages.Integer;
            case 'url':
                return messages.URL;
            case 'date-time':
                return messages.DateTime;
            case 'date':
                return messages.Date;
            default:
                return messages.Other;
        }
    }

    GetPlaceholderByFieldType(type: string, pattern: string = ""): string {
        switch (type) {
            case 'email':
                return PlaceholderByFieldType.Email;
            case 'number':
                return PlaceholderByFieldType.Number;
            case 'duration':
                return PlaceholderByFieldType.Number;
            case 'integer':
                return PlaceholderByFieldType.Number;
            case 'url':
                if (pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+') {
                    return PlaceholderByFieldType.IPFS;
                }
                return PlaceholderByFieldType.URL;
            case 'string':
                return PlaceholderByFieldType.String;
            default:
                return "";
        }
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

    getConditions(field: any) {
        if (!this.conditions) {
            return [];
        }
        else {
            return this.conditions!.filter((item: any) => item.ifCondition.field.name === field.name);
        }
    }

    removeConditionFields(fields: SchemaField[], condition: any) {
        condition.conditionForm = new FormGroup({});
        this.subscribeCondition(condition.conditionForm);
        fields.forEach(item => {
            setTimeout(() => this.options?.removeControl(item.name, { emitEvent: false }));
        });
    }

    private subscribeCondition(controlCondition: FormGroup) {
        let oldValue: string[] = [];
        controlCondition.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(val => {
                let newControls = Object.keys(val);
                if (newControls.length !== oldValue.length) {
                    let newControlsExceptOld = newControls.filter(item => !oldValue.includes(item));
                    let oldControlsExceptNew = oldValue.filter(item => !newControls.includes(item));

                    oldControlsExceptNew.forEach(field => {
                        this.options?.removeControl(field, {
                            emitEvent: false
                        });
                    });

                    oldValue = newControls;

                    newControlsExceptOld.forEach(name => {
                        setTimeout(() => this.options?.addControl(name, controlCondition.get(name)!));
                    });
                }
            });
    }


    ngOnDestroy() {
        this.destroy.emit();
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
