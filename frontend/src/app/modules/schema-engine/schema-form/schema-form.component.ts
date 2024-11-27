import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { GenerateUUIDv4, Schema, SchemaField, UnitSystem } from '@guardian/interfaces';
import { fullFormats } from 'ajv-formats/dist/formats';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IPFSService } from 'src/app/services/ipfs.service';
import { uriValidator } from 'src/app/validators/uri.validator';
import { GUARDIAN_DATETIME_FORMAT } from '../../../utils/datetime-format';
import { API_IPFS_GATEWAY_URL, IPFS_SCHEMA } from '../../../services/api';
import { SchemaRuleValidateResult } from '../../common/models/field-rule-validator';

enum PlaceholderByFieldType {
    Email = "example@email.com",
    Number = "123",
    URL = "https://example.com",
    URI = "example:uri",
    String = "Please enter text here",
    IPFS = 'ipfs.io/ipfs/example-hash',
    HederaAccount = '0.0.1',
    Duration = 'P1D'
}

enum ErrorFieldMessageByFieldType {
    Email = "Please make sure the field contain a valid email address",
    Number = "Please make sure the field contain a valid number value",
    Duration = "Please make sure the field contain a valid duration value",
    Integer = "Please make sure the field contain a valid integer value",
    URL = "Please make sure the field contain a valid URL value",
    URI = "Please make sure the field contain a valid URI value",
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
    URI = "Please make sure all fields contain a valid URI value",
    DateTime = "Please make sure all fields contain a valid datetime value",
    Date = "Please make sure all fields contain a valid date value",
    Other = "Please make sure all fields contain a valid value"
};

class IButton {
    id: string;
    visible: () => boolean;
    disabled: () => boolean;
    text: string;
    class: string;
    type: string;
    fn: () => void;
}

interface IFieldControl<T extends UntypedFormControl | UntypedFormGroup | UntypedFormArray> extends SchemaField {
    id: string;
    hide: boolean;
    field: SchemaField;
    path: string;
    fullPath: string;
    control: T;
    preset?: any;
    isPreset?: boolean;
    fileUploading?: boolean;
    enumValues?: any;
    displayRequired?: boolean;
    readonly?: boolean;
    list?: IFieldIndexControl<any>[];
    open: boolean;
    autocalculate: boolean;
}

interface IFieldIndexControl<T extends UntypedFormControl | UntypedFormGroup> {
    id: string;
    name: string;
    preset: any,
    index: string;
    index2: string;
    control: T;
    fileUploading?: boolean;
    open: boolean
}

/**
 * Form built by schema
 */
@Component({
    selector: 'app-schema-form',
    templateUrl: './schema-form.component.html',
    styleUrls: ['./schema-form.component.scss'],
    providers: [
        { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
        { provide: NGX_MAT_DATE_FORMATS, useValue: GUARDIAN_DATETIME_FORMAT }
    ]
})
export class SchemaFormComponent implements OnInit {
    @Input('private-fields') hide!: { [x: string]: boolean };
    @Input('readonly-fields') readonly?: any;
    @Input('schema') schema!: Schema;
    @Input('fields') schemaFields?: SchemaField[];
    @Input('formGroup') group!: UntypedFormGroup;
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input('conditions') conditions: any = null;
    @Input('preset') presetDocument: any = null;
    @Input('example') example: boolean = false;
    @Input() cancelText: string = 'Cancel';
    @Input() submitText: string = 'Submit';
    @Input() cancelHidden: boolean = false;
    @Input() submitHidden: boolean = false;
    @Input() showButtons: boolean = true;
    @Input() isChildSchema: boolean = false;
    @Input() comesFromDialog: boolean = false;
    @Input() dryRun?: boolean = false;
    @Input() policyId?: string = '';
    @Input() rules?: SchemaRuleValidateResult;
    @Input() paginationHidden: boolean = true;
    @Input() isFormForFinishSetup: boolean = false;

    @Output('change') change = new EventEmitter<Schema | null>();
    @Output('destroy') destroy = new EventEmitter<void>();
    @Output() cancelBtnEvent = new EventEmitter<boolean>();
    @Output() submitBtnEvent = new EventEmitter<IFieldControl<any>[] | undefined | boolean>();
    @Output('buttons') buttons = new EventEmitter<any>();

    public destroy$: Subject<boolean> = new Subject<boolean>();
    public options: UntypedFormGroup | undefined;
    public fields: IFieldControl<any>[] | undefined = [];
    public conditionFields: SchemaField[] = [];
    public isShown: boolean[] = [true];
    public currentIndex: number = 0;
    public iri?: string;

    public buttonsConfig: IButton[] = [
        {
            id: 'cancel',
            visible: () => {
                if (!this.fields || this.isChildSchema) {
                    return false;
                }
                return this.currentIndex === 0 && !this.cancelHidden;
            },
            disabled: () => {
                return false;
            },
            text: this.cancelText,
            class: 'p-button-outlined',
            type: 'secondary',
            fn: () => {
                this.onCancelBtnClick();
            },
        },
        {
            id: 'prev',
            visible: () => {
                if (!this.fields || this.isChildSchema) {
                    return false;
                }
                return this.currentIndex !== 0;
            },
            disabled: () => {
                return false;
            },
            text: 'Previous',
            class: 'p-button-outlined',
            type: 'secondary',
            fn: () => {
                this.getPrevShownFields(this.fields);
            },
        },
        {
            id: 'next',
            visible: () => {
                if (!this.fields || this.isChildSchema) {
                    return false;
                }
                return !this.isShown[this.fields.length - 1];
            },
            disabled: () => {
                return false;
            },
            text: 'Next',
            class: 'p-button',
            type: 'primary',
            fn: () => {
                this.getNextShownFields(this.fields);
            },
        },
        {
            id: 'submit',
            visible: () => {
                if (!this.fields || this.isChildSchema) {
                    return false;
                }
                return !!this.isShown[this.fields.length - 1] && !this.submitHidden;
            },
            disabled: () => {
                return false;
            },
            text: this.submitText,
            class: 'p-button',
            type: 'primary',
            fn: () => {
                this.onSubmitBtnClick(this.fields);
            },
        }
    ]

    private _patternByNumberType: any = {
        number: /^-?\d*(\.\d+)?$/,
        integer: /^-?\d*$/
    };

    constructor(
        private ipfs: IPFSService,
        protected changeDetectorRef: ChangeDetectorRef
    ) { }


    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (
            changes.schema ||
            changes.schemaFields ||
            changes.hide ||
            changes.readonly ||
            changes.group ||
            changes.conditions ||
            changes.presetDocument
        ) {
            this.buildFields();
        }
        if (changes.rules && this.rules) {
            for (const value of Object.values(this.rules)) {
                if (value.status === 'Failure' || value.status === 'Error') {
                    value.tooltip = 'Failure: ' + value.rules
                        .filter((r) => r.status === 'Failure' || r.status === 'Error')
                        .map((r) => r.name)
                        .join(', ');
                } else {
                    value.tooltip = 'Success: ' + value.rules
                        .filter((r) => r.status === 'Success')
                        .map((r) => r.name)
                        .join(', ');
                }

            }
        }
    }

    ngOnDestroy() {
        this.destroy.emit();
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private buildFields() {
        let schemaFields: SchemaField[] | undefined = undefined;

        if (this.schema) {
            schemaFields = this.schema.fields;

            if (!this.conditions) {
                this.conditions = this.schema.conditions;
            }

            this.iri = this.schema.iri;
        }

        if (this.schemaFields) {
            schemaFields = this.schemaFields;
        }

        this.hide = this.hide || {};
        this.conditionFields = [];

        if (this.conditions) {
            this.conditions = this.conditions.map((cond: any) => {
                if (this.presetDocument) {
                    cond.preset = {};
                    for (const thenField of cond.thenFields) {
                        cond.preset[thenField?.name] =
                            this.presetDocument[thenField?.name];
                    }
                    for (const elseField of cond.elseFields) {
                        cond.preset[elseField?.name] =
                            this.presetDocument[elseField?.name];
                    }
                }
                const conditionForm = new UntypedFormGroup({});
                this.subscribeCondition(conditionForm);
                this.conditionFields.push(...cond.thenFields);
                this.conditionFields.push(...cond.elseFields);
                return Object.assign({ conditionForm }, cond);
            });
        }

        this.update(schemaFields);
        this.updateButton();
    }

    private createControl(item: IFieldControl<any>, preset: any): UntypedFormControl | UntypedFormGroup | UntypedFormArray {
        const validators = this.getValidators(item);
        const value = (preset === null || preset === undefined) ? undefined : preset;
        return new UntypedFormControl(value, validators);
    }

    private createArrayControl(): UntypedFormArray {
        return new UntypedFormArray([]);
    }

    private createSubSchemaControl(item: IFieldControl<any>): UntypedFormControl | UntypedFormGroup | UntypedFormArray {
        if (item.customType === 'geo' || item.customType === 'sentinel') {
            return new UntypedFormControl({})
        } else {
            return new UntypedFormGroup({});
        }
    }

    private updateButton() {
        this.buttons.emit(this.buttonsConfig);
    }

    private update(schemaFields?: SchemaField[]) {
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
            const item = this.createFieldControl(field, this.presetDocument);
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

        if (this.fields) {
            for (let i = 0; i < this.fields.length; i++) {
                if (this.fields[i].isRef) {
                    this.isShown[i] = true;
                    break;
                }
                this.isShown[i] = true;
            }
        }

        this.options?.updateValueAndValidity();
        this.changeDetectorRef.detectChanges();
    }

    public addGroup(item: IFieldControl<any>) {
        item.control = this.createSubSchemaControl(item);
        this.options?.addControl(item.name, item.control);
        this.change.emit();
        this.changeDetectorRef.detectChanges();
    }

    public isInput(item: SchemaField): boolean {
        return (
            (
                item.type === 'string' ||
                item.type === 'number' ||
                item.type === 'integer' ||
                item.customType === 'geo' ||
                item.customType === 'sentinel'
            ) && (
                item.format !== 'date' &&
                item.format !== 'time' &&
                item.format !== 'date-time'
            ) && !item.remoteLink && !item.enum
        );
    }

    uploadFile(item: any): void {
        const input = document.createElement('input');

        const control = item.control;

        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event) => {
            const file = input.files ? input.files[0] : undefined;
            if (!file) {
                return;
            }
            item.fileUploading = true;

            let addFileObs;
            if (this.dryRun && this.policyId) {
                addFileObs = this.ipfs.addFileDryRun(file, this.policyId)
            } else {
                addFileObs = this.ipfs.addFile(file)
            }
            addFileObs
                .subscribe(res => {
                    if (item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+') {
                        control.patchValue(API_IPFS_GATEWAY_URL + res);
                    } else {
                        control.patchValue(IPFS_SCHEMA + res);
                    }
                    item.fileUploading = false;
                }, error => {
                    item.fileUploading = false;
                });

            input.remove();
        }
        input.click();
    }

    public ifFieldVisible(item: IFieldControl<any>): boolean {
        return !item.hide && !item.hidden && !item.autocalculate;
    }

    public addItem(item: IFieldControl<UntypedFormArray>) {
        const listItem = this.createListControl(item);
        if (item.list) {
            item.list.push(listItem);
            for (let index = 0; index < item.list.length; index++) {
                const element = item.list[index];
                element.index = String(index);
                element.index2 = String(index + 1);
            }
        }
        setTimeout(() => {
            if (item.control) {
                item.control.push(listItem.control);
            }
            this.options?.updateValueAndValidity();
            this.change.emit();
        });
    }

    private createListControl(item: IFieldControl<any>, preset?: any): IFieldIndexControl<any> {
        const count = item.list?.length || 0;
        const listItem: IFieldIndexControl<any> = {
            id: GenerateUUIDv4(),
            name: item.name,
            preset: preset,
            index: String(count),
            index2: String(count + 1),
            control: null,
            open: true
        }
        if (item.isRef) {
            listItem.control = this.createSubSchemaControl(item);
        } else {
            listItem.fileUploading = false;
            listItem.control = this.createControl(item, preset);
            this.postFormat(item, listItem.control);
        }

        return listItem;
    }

    consoleLog(item: any) {
        console.log(item.control.value);
    }

    parseDate(item: string, calendar: any): Date {
        setTimeout(() => {
            if (!calendar.el.nativeElement.querySelector('input').value && item) {
                calendar.el.nativeElement.querySelector('input').value = moment(item).format('YYYY-MM-DD HH:mm:ss');
            }
        }, 200);
        return new Date(item);
    }

    public removeGroup(item: IFieldControl<any>, event: any) {
        if (event?.stopPropagation) {
            event.stopPropagation();
        }
        item.control = null;
        this.changeDetectorRef.detectChanges();
        this.options?.removeControl(item.name);
        this.options?.updateValueAndValidity();
        this.change.emit();
    }

    public removeItem(item: any, listItem: any, event: any) {
        if (event?.stopPropagation) {
            event.stopPropagation();
        }
        const index = item.list.indexOf(listItem);
        item.control.removeAt(index);
        item.list.splice(index, 1);
        for (let index = 0; index < item.list.length; index++) {
            const element = item.list[index];
            element.index = String(index);
            element.index2 = String(index + 1);
        }
        this.options?.updateValueAndValidity();
        this.change.emit();
    }

    private getValidators(item: any): ValidatorFn[] {

        const validators = [];

        if (item.required) {
            validators.push(Validators.required);
        }

        if (item.pattern) {
            validators.push(Validators.pattern(new RegExp(item.pattern)));
            return validators;
        }

        if (item.format === 'email') {
            validators.push(Validators.pattern(fullFormats.email as RegExp));
        }

        if (item.type === 'number') {
            validators.push(this.isNumberOrEmptyValidator());
        }

        if (item.format === 'duration') {
            validators.push(Validators.pattern(fullFormats.duration as RegExp));
        }

        if (item.type === 'integer') {
            validators.push(this.isNumberOrEmptyValidator());
        }

        if (item.format === 'url') {
            validators.push(Validators.pattern(fullFormats.url as RegExp));
        }

        if (item.format === 'uri') {
            validators.push(uriValidator());
        }

        return validators;
    }

    public getInvalidMessageByFieldType(item: SchemaField): string {
        const type = item.format || item.type;
        const messages = item.isArray
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
            case 'uri':
                return messages.URI;
            case 'date-time':
                return messages.DateTime;
            case 'date':
                return messages.Date;
            default:
                return messages.Other;
        }
    }

    public getPlaceholderByFieldType(item: SchemaField): string {
        const type = item.format || item.type;
        const pattern = item.pattern;
        const customType = item.customType;
        if (customType) {
            switch (customType) {
                case 'hederaAccount':
                    return PlaceholderByFieldType.HederaAccount;
                default:
                    return "";
            }
        }
        switch (type) {
            case 'email':
                return PlaceholderByFieldType.Email;
            case 'number':
                return PlaceholderByFieldType.Number;
            case 'duration':
                return PlaceholderByFieldType.Duration;
            case 'integer':
                return PlaceholderByFieldType.Number;
            case 'url':
                if (pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+') {
                    return PlaceholderByFieldType.IPFS;
                }
                return PlaceholderByFieldType.URL;
            case 'uri':
                return PlaceholderByFieldType.URI;
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

    public getConditions(field: any) {
        if (!this.conditions) {
            return [];
        }
        else {
            return this.conditions!.filter((item: any) => item.ifCondition.field.name === field.name);
        }
    }

    public removeConditionFields(fields: SchemaField[], condition: any) {
        condition.conditionForm = new UntypedFormGroup({});
        this.subscribeCondition(condition.conditionForm);
        fields.forEach(item => {
            setTimeout(() => this.options?.removeControl(item.name, { emitEvent: false }));
        });
    }

    private subscribeCondition(controlCondition: UntypedFormGroup) {
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

    public isHelpText(item: SchemaField): boolean {
        return item.type === 'null';
    }

    suggestIsObject(item: any): boolean {
        return typeof item === 'object';
    }

    public parseSuggest(item: any): string {
        return this.findString(item);
    }

    private findString(item: any): string {
        if (typeof item === 'object') {
            return this.findString(Object.values(item)[0]);
        } else {
            return item as string;
        }
    }

    public isTime(item: SchemaField): boolean {
        return item.type === 'string' && item.format === 'time';
    }

    public isDate(item: SchemaField): boolean {
        return item.type === 'string' && item.format === 'date';
    }

    public isDateTime(item: SchemaField): boolean {
        return item.type === 'string' && item.format === 'date-time';
    }

    public isBoolean(item: SchemaField): boolean {
        return item.type === 'boolean';
    }

    public isIPFS(item: SchemaField): boolean {
        return item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+'
            || item.pattern === '^ipfs:\/\/.+';
    }

    private postFormat(item: any, control: UntypedFormControl): any {
        const format = item.format;
        const type = item.type;
        const pattern = item.pattern;
        const customType = item.customType;

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
                } else if (format === 'time') {
                    const momentDate = moment(val);
                    if (momentDate.isValid()) {
                        momentDate.milliseconds(0);
                        valueToSet = momentDate.format('HH:mm:ss');
                    } else {
                        valueToSet = "";
                    }
                } else if (type === 'number' || type === 'integer') {
                    if (typeof (val) === 'string') {
                        if (
                            (!pattern && !this._patternByNumberType[type].test(val)) ||
                            (pattern && !val?.match(pattern))
                        ) {
                            valueToSet = null;
                        } else if (type == 'integer') {
                            valueToSet = parseInt(val);
                        } else if (type == 'number') {
                            valueToSet = parseFloat(val);
                        }
                    }
                    if (!Number.isFinite(valueToSet)) {
                        valueToSet = val;
                    }
                } else if (customType === 'geo' || customType === 'sentinel') {
                    try {
                        valueToSet = JSON.parse(val);
                    } catch {
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

    public isEnum(item: SchemaField) {
        return item.remoteLink || item.enum;
    }

    public isPrefix(item: SchemaField): boolean {
        return item.unitSystem === UnitSystem.Prefix;
    }

    public isPostfix(item: SchemaField): boolean {
        return item.unitSystem === UnitSystem.Postfix;
    }

    public getNextShownFields(fields: SchemaField[] | undefined): boolean[] {
        if (!fields) {
            return this.isShown;
        }
        this.isShown = new Array(fields.length).fill(false);
        let nextRefIndex = -1;
        let initialDivision = 0;
        for (let i = this.currentIndex + 1; i < fields.length; i++) {
            nextRefIndex = i;
            if (fields[i].isRef) {
                if (this.currentIndex == 0 && initialDivision == 0) {
                    initialDivision = 1;
                    this.currentIndex = i;
                    this.isShown = new Array(fields.length).fill(false);
                    if (fields[this.currentIndex].isRef && fields[this.currentIndex - 1].isRef) {
                        this.isShown[this.currentIndex] = true;
                        break;
                    }
                    continue;
                }
                break;
            }
            this.isShown[i] = true;
        }
        if (nextRefIndex !== -1) {
            if (this.currentIndex === 0) {
                this.currentIndex = -1;
            }
            for (let i = this.currentIndex + 1; i <= nextRefIndex; i++) {
                this.isShown[i] = true;
            }
            this.currentIndex = nextRefIndex;
        }
        this.updateButton();

        const contentElement = document.querySelector('#main-content');
        const formElement = document.querySelector('.schema-form');
        setTimeout(() => {
            if (window.innerWidth <= 810) {
                contentElement!.scrollTo({
                    top: -1,
                    behavior: 'smooth'
                });
            } else {
                if (formElement) {
                    formElement.scrollTo({
                        top: -1,
                        behavior: 'smooth'
                    });
                }
            }
        }, 100)

        return this.isShown;
    }

    public getPrevShownFields(fields: SchemaField[] | undefined): boolean[] {
        if (!fields) {
            return this.isShown;
        }
        this.isShown = new Array(fields.length).fill(false);
        let prevRefIndex = -1;
        if (this.currentIndex === 0) {
            // If the current index is already at the beginning of the array,
            // show all fields with isRef set to false
            for (let i = 0; i < fields.length; i++) {
                if (!fields[i].isRef) {
                    this.isShown[i] = true;
                }
            }
        } else {
            for (let i = this.currentIndex - 1; i >= 0; i--) {
                if (fields[i].isRef) {
                    prevRefIndex = i;
                    for (let j = prevRefIndex - 1; j >= 0; j--) {
                        if (fields[j].isRef) {
                            break
                        } else if (j == 0) {
                            prevRefIndex = 0;
                        }
                    }
                    break;
                }
                //this.isShown[i] = true;
                this.currentIndex = i;
            }
            if (prevRefIndex !== -1) {
                for (let i = this.currentIndex - 1; i >= prevRefIndex; i--) {
                    this.isShown[i] = true;
                }
                this.currentIndex = prevRefIndex;
            }
        }
        this.updateButton();

        const contentElement = document.querySelector('#main-content');
        const formElement = document.querySelector('.schema-form');
        setTimeout(() => {
            if (window.innerWidth <= 810) {
                contentElement!.scrollTo({
                    top: -1,
                    behavior: 'smooth'
                });
            } else {
                if (formElement) {
                    formElement.scrollTo({
                        top: -1,
                        behavior: 'smooth'
                    });
                }
            }
        }, 100)


        return this.isShown;
    }

    public closeWindow() {
        window.close();
    }

    public onCancelBtnClick() {
        this.cancelBtnEvent.emit(false);
    }

    public onSubmitBtnClick(fields: IFieldControl<any>[] | undefined) {
        this.submitBtnEvent.emit(fields);
    }

    public patchSuggestValue(item: IFieldControl<any>) {
        const suggest = item.suggest;
        if (item.isRef) {
            const newItem = this.createFieldControl(item.field, {
                [item.field.name]: suggest,
            });
            this.options?.removeControl(item.field.name);
            this.options?.addControl(item.field.name, newItem.control);
            this.fields = this.fields?.map(field => field === item ? newItem : field);
            newItem.control?.markAsDirty();
            this.changeDetectorRef.detectChanges();
            return;
        }
        if (item.isArray) {
            (item.control as UntypedFormArray)?.clear();
            item.list = [];
            let count = suggest.length;
            while (count-- > 0) {
                const control = this.createListControl(item);
                item.list.push(control);
                (item.control as UntypedFormArray).push(control.control);
            }
        }
        item.control?.patchValue(suggest);
        item.control?.markAsDirty();
    }

    public isEmpty(value: any): boolean {
        if (Array.isArray(value)) {
            return !value.some(item => !this.isEmpty(item));
        }
        return [undefined, null, ''].includes(value);
    }

    public isEmptyRef(value: any, field: SchemaField): boolean {
        if (value === undefined || value === null) {
            return true;
        }
        if (Array.isArray(value)) {
            return !value.some(item => !this.isEmptyRef(item, field));
        }
        if (field.customType === 'geo') {
            return Object.keys(value).length === 0;
        }
        if (field.fields) {
            for (const _field of field.fields) {
                if (_field.isRef && !this.isEmptyRef(value[_field.name], _field)) {
                    return false;
                }
                if (!_field.isRef && !this.isEmpty(value[_field.name])) {
                    return false;
                }
            }
        }
        return true;
    }

    public getJSON(value: any) {
        return JSON.stringify(value, null, 4);
    }

    private getComment(field: SchemaField) {
        try {
            if (typeof field.comment === 'string') {
                const comment = JSON.parse(field.comment);
                return comment;
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    private createFieldControl(field: SchemaField, preset?: any): IFieldControl<any> {
        const comment = this.getComment(field);
        const item: IFieldControl<any> = {
            ...field,
            hide: false,
            autocalculate: !!comment?.autocalculate,
            id: GenerateUUIDv4(),
            field,
            path: field.path || '',
            fullPath: field.fullPath || '',
            control: null,
            open: true
        }

        item.preset = field.default;
        if (preset) {
            item.isPreset = true;
            item.preset = preset[field.name];
        }

        if (!field.isArray && !field.isRef) {
            item.fileUploading = false;
            item.control = this.createControl(item, item.preset);
            if (field.remoteLink) {
                item.fileUploading = true;
                this.ipfs
                    .getJsonFileByLink(field.remoteLink)
                    .then((res: any) => {
                        item.enumValues = res.enum;
                    })
                    .finally(() => item.fileUploading = false);
            }
            if (field.enum) {
                item.enumValues = field.enum;
            }
            this.postFormat(item, item.control);
        }

        if (!field.isArray && field.isRef) {
            item.fields = field.fields;
            item.displayRequired = item.fields?.some((refField: any) => refField.required);
            if (field.required || item.preset) {
                item.control = this.createSubSchemaControl(item);
            }
        }

        if (field.isArray && !field.isRef) {
            item.control = this.createArrayControl();
            item.list = [];
            if (field.remoteLink) {
                item.fileUploading = true;
                this.ipfs
                    .getJsonFileByLink(field.remoteLink)
                    .then((res: any) => {
                        item.enumValues = res.enum;
                    })
                    .finally(() => item.fileUploading = false);
            }
            if (field.enum) {
                item.enumValues = field.enum;
            }
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
            item.control = this.createArrayControl();
            item.list = [];
            item.fields = field.fields;
            if (item.preset && item.preset.length) {
                for (let index = 0; index < item.preset.length; index++) {
                    const preset = item.preset[index];
                    const listItem = this.createListControl(item, preset);//todo
                    item.list.push(listItem);
                    item.control.push(listItem.control);
                }
                this.options?.updateValueAndValidity();
                this.change.emit();
            } else if (field.required) {
                const listItem = this.createListControl(item);//todo
                item.list.push(listItem);
                item.control.push(listItem.control);

                this.options?.updateValueAndValidity();
                this.change.emit();
            }
        }

        if (
            this.readonly &&
            this.readonly.find(
                (readonlyItem: any) => readonlyItem.name === field.name
            )
        ) {
            item.readonly = true;
            setTimeout(() => {
                item.control?.disable();
                item.control?.disable();
            });
        }
        return item;
    }

    public showPage(item: IFieldControl<any>, index: number): boolean {
        return this.isShown[index] || this.isChildSchema;
    }

    public ifSimpleField(item: IFieldControl<any>): boolean {
        return !item.isArray && !item.isRef;
    }

    public ifSubSchema(item: IFieldControl<any>): boolean {
        return !item.isArray && item.isRef;
    }

    public ifSimpleArray(item: IFieldControl<any>): boolean {
        return item.isArray && !item.isRef;
    }

    public ifSubSchemaArray(item: IFieldControl<any>): boolean {
        return item.isArray && item.isRef;
    }

    public ifInvalidField(item: IFieldControl<any> | IFieldIndexControl<any>): boolean {
        return (item.control && !item.control.valid && !item.control.disabled);
    }

    public ifRequiredField(item: IFieldControl<any>): boolean {
        return item.required && !item.control.disabled;
    }

    public isRules(item: IFieldControl<any>) {
        return this.rules ? this.rules[item.fullPath] : undefined;
    }

    public isRulesStatus(item: IFieldControl<any>) {
        return this.rules?.[item.fullPath]?.status;
    }
}
