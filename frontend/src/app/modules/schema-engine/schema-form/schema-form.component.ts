import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { GenerateUUIDv4, Schema, SchemaField, UnitSystem } from '@guardian/interfaces';
import { fullFormats } from 'ajv-formats/dist/formats';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { API_IPFS_GATEWAY_URL, IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';
import { uriValidator } from 'src/app/validators/uri.validator';

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

/**
 * Form built by schema
 */
@Component({
    selector: 'app-schema-form',
    templateUrl: './schema-form.component.html',
    styleUrls: ['./schema-form.component.scss'],
    providers: [
        { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
        { provide: NGX_MAT_DATE_FORMATS, useValue: DATETIME_FORMATS }
    ]
})
export class SchemaFormComponent implements OnInit {
    @Input('private-fields') hide!: { [x: string]: boolean };
    @Input('readonly-fields') readonly?: any;
    @Input('schema') schema!: Schema;
    @Input('fields') schemaFields!: SchemaField[];
    @Input('formGroup') group!: FormGroup;
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input('conditions') conditions: any = null;
    @Input('preset') presetDocument: any = null;
    @Input() cancelText: string = 'Cancel';
    @Input() submitText: string = 'Submit';
    @Input() cancelHidden: boolean = false;
    @Input() submitHidden: boolean = false;
    @Input() showButtons: boolean = true;
    @Input() isChildSchema: boolean = false;
    @Input() comesFromDialog: boolean = false;

    @Input() isFormForFinishSetup: boolean = false;

    @Output('change') change = new EventEmitter<Schema | null>();
    @Output('destroy') destroy = new EventEmitter<void>();
    @Output() cancelBtnEvent = new EventEmitter<boolean>();
    @Output() submitBtnEvent = new EventEmitter<boolean>();

    public destroy$: Subject<boolean> = new Subject<boolean>();
    public options: FormGroup | undefined;
    public fields: any[] | undefined = [];
    public conditionFields: SchemaField[] = [];
    public isShown: boolean[] = [true];
    public currentIndex: number = 0;

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

    ngOnChanges() {
        let schemaFields: SchemaField[] | undefined = undefined;

        if (this.schema) {
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
                cond.conditionForm = new FormGroup({});
                this.subscribeCondition(cond.conditionForm);
                this.conditionFields.push(...cond.thenFields);
                this.conditionFields.push(...cond.elseFields);
            });
        }

        this.update(schemaFields);
    }

    ngOnDestroy() {
        this.destroy.emit();
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
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

    private createFieldControl(field: SchemaField): any {
        const item: any = {
            ...field,
            hide: false,
            id: GenerateUUIDv4()
        }

        if (this.presetDocument) {
            item.preset = this.presetDocument[field.name];
        } else {
            item.preset = null;
        }

        if (!field.isArray && !field.isRef) {
            item.fileUploading = false;
            const validators = this.getValidators(item);
            item.control = new FormControl(item.preset === null || item.preset === undefined ? "" : item.preset, validators);
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
            item.displayRequired = item.fields.some((refField: any) => refField.required);
            if (field.required || item.preset) {
                item.control =
                    item.customType === 'geo'
                        ? new FormControl({})
                        : new FormGroup({});
            }
        }

        if (field.isArray && !field.isRef) {
            item.control = new FormArray([]);
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
            item.control = new FormArray([]);
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

    private createListControl(item: any, preset?: any): any {
        const listItem: any = {
            name: item.name,
            preset: preset,
            index: String(item.list.length),
        }
        if (item.isRef) {
            listItem.control =
                item.customType === 'geo'
                    ? new FormControl({})
                    : new FormGroup({});
        } else {
            listItem.fileUploading = false;
            const validators = this.getValidators(item);
            listItem.control = new FormControl(preset === null || preset === undefined ? "" : preset, validators);
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

    private postFormat(item: any, control: FormControl): any {
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
                } else if (customType === 'geo') {
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

    public addItem(item: any) {
        const listItem = this.createListControl(item);
        item.list.push(listItem);
        setTimeout(() => {
            item.control.push(listItem.control);
            this.options?.updateValueAndValidity();
            this.change.emit();
        });
    }

    public addGroup(item: any) {
        item.control =
            item.customType === 'geo' ? new FormControl({}) : new FormGroup({});
        this.options?.addControl(item.name, item.control);
        this.change.emit();
        this.changeDetectorRef.detectChanges();
    }

    public removeGroup(item: any) {
        this.options?.removeControl(item.name);
        this.options?.updateValueAndValidity();
        item.control = null;
        this.change.emit();
    }

    public removeItem(item: any, listItem: any) {
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


    public onFileSelected(event: any, control: AbstractControl, item: any) {
        control.patchValue("");
        const file = event?.target?.files[0];

        if (!file) {
            return;
        }
        item.fileUploading = true;
        this.ipfs.addFile(file)
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

    public isHelpText(item: SchemaField): boolean {
        return item.type === 'null';
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

    public isInput(item: SchemaField): boolean {
        return (
            (
                item.type === 'string' ||
                item.type === 'number' ||
                item.type === 'integer' ||
                item.customType === 'geo'
            ) && (
                item.format !== 'date' &&
                item.format !== 'time' &&
                item.format !== 'date-time'
            ) && !item.remoteLink && !item.enum
        );
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

    public getNextShownFields(fields: SchemaField[]): boolean[] {
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

    public getPrevShownFields(fields: SchemaField[]): boolean[] {
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

    public onSubmitBtnClick(fields: any) {
        this.submitBtnEvent.emit(fields);
    }
}
