import { UntypedFormArray, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SchemaField } from '@guardian/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export const SYSTEM_FIELDS = [
    '@context',
    'type',
]

export class FieldControl {
    public readonly name: string;

    public controlKey: UntypedFormControl;
    public controlTitle: UntypedFormControl;
    public hidden: UntypedFormControl;
    public controlDescription: UntypedFormControl;
    public controlType: UntypedFormControl;
    public property: UntypedFormControl;
    public controlRequired: UntypedFormControl;
    public controlArray: UntypedFormControl;
    public controlUnit: UntypedFormControl;
    public controlRemoteLink: UntypedFormControl;
    public controlEnum: UntypedFormArray;
    public controlAvailableOptions: UntypedFormArray;
    public controlColor: UntypedFormControl;
    public controlSize: UntypedFormControl;
    public controlBold: UntypedFormControl;
    public controlPrivate: UntypedFormControl;
    public controlPattern: UntypedFormControl;
    public controlDefault: UntypedFormControl;
    public controlSuggest: UntypedFormControl;
    public controlExample: UntypedFormControl;
    public autocalculated: UntypedFormControl;
    public expression: UntypedFormControl;

    private readonly _defaultFieldMap!: any;
    private _entityType: UntypedFormControl | undefined;

    constructor(
        field: SchemaField | null,
        type: string,
        destroyEvent: Subject<any>,
        defaultFieldMap: any,
        entityType?: UntypedFormControl,
        name?: string
    ) {
        this._defaultFieldMap = defaultFieldMap;
        this._entityType = entityType;
        this.name = `field${Date.now()}${Math.floor(Math.random() * 1000000)}`;
        if (field) {
            this.controlKey = new UntypedFormControl(field.name, [
                Validators.required,
                this.keyValidator(),
                this.fieldSystemKeyValidator()
            ]);
            this.controlKey.valueChanges
                .pipe(takeUntil(destroyEvent))
                .subscribe(this.trimFormControlValue.bind(this));
            this.controlTitle = new UntypedFormControl(field.title, Validators.required);
            this.controlDescription = new UntypedFormControl(field.description, Validators.required);
            this.controlType = new UntypedFormControl(type, Validators.required);
            this.controlRequired = new UntypedFormControl(field.required);
            this.controlArray = new UntypedFormControl(field.isArray);
            this.controlUnit = new UntypedFormControl(field.unit);
            this.controlRemoteLink = new UntypedFormControl(field.remoteLink);
            this.controlPrivate = new UntypedFormControl(field.isPrivate || false);
            this.controlEnum = new UntypedFormArray([]);
            this.controlAvailableOptions = new UntypedFormArray([]);
            this.hidden = new UntypedFormControl(!!field.hidden);
            this.property = new UntypedFormControl(field.property || '');
            field.enum?.forEach(item => {
                this.controlEnum.push(new UntypedFormControl(item))
            });
            field.availableOptions?.forEach(item => {
                this.controlAvailableOptions.push(new UntypedFormControl(item))
            });

            this.controlColor = new UntypedFormControl(field.textColor || '#000000');
            this.controlSize = new UntypedFormControl(field.textSize && +field.textSize.replace('px', '') || 18);
            this.controlBold = new UntypedFormControl(field.textBold || false);
            this.controlPattern = new UntypedFormControl(field.pattern);
            this.controlDefault = new UntypedFormControl(field.default);
            this.controlSuggest = new UntypedFormControl(field.suggest);
            this.controlExample = new UntypedFormControl(field.examples?.[0]);
            this.autocalculated = new UntypedFormControl(field.autocalculate);
            this.expression = new UntypedFormControl(field.expression);
        } else {
            this.controlKey = new UntypedFormControl(name || this.name, [
                Validators.required,
                this.keyValidator(),
                this.fieldSystemKeyValidator()
            ]);
            this.controlKey.valueChanges
                .pipe(takeUntil(destroyEvent))
                .subscribe(this.trimFormControlValue.bind(this));
            this.controlTitle = new UntypedFormControl(name || this.name, Validators.required);
            this.controlDescription = new UntypedFormControl('', Validators.required);
            this.controlType = new UntypedFormControl(type, Validators.required);
            this.controlRequired = new UntypedFormControl(false);
            this.controlArray = new UntypedFormControl(false);
            this.controlUnit = new UntypedFormControl('');
            this.controlRemoteLink = new UntypedFormControl('');
            this.controlEnum = new UntypedFormArray([]);
            this.controlAvailableOptions = new UntypedFormArray([]);
            this.controlColor = new UntypedFormControl('#000000');
            this.controlSize = new UntypedFormControl(18);
            this.controlBold = new UntypedFormControl(false);
            this.controlPrivate = new UntypedFormControl(false);
            this.controlPattern = new UntypedFormControl('');
            this.controlDefault = new UntypedFormControl();
            this.controlSuggest = new UntypedFormControl();
            this.controlExample = new UntypedFormControl();
            this.hidden = new UntypedFormControl(false);
            this.property = new UntypedFormControl('');
            this.autocalculated = new UntypedFormControl(false);
            this.expression = new UntypedFormControl('');
        }
        if (this._entityType) {
            this._entityType.valueChanges
                .pipe(takeUntil(destroyEvent))
                .subscribe(() => this.controlKey.updateValueAndValidity());
        }
        // this.hidden.valueChanges.subscribe(value => {
        //     if (value === true) {
        //         this.controlRequired.setValue(false);
        //     }
        // })
    }

    private trimFormControlValue(value: string) {
        if (value) {
            this.controlKey.patchValue(value.trim(), { emitEvent: false })
        }
    }

    public get key(): string {
        return this.controlKey.value;
    }

    public get title(): string {
        return this.controlTitle.value;
    }

    public get description(): string {
        return this.controlDescription.value;
    }

    public get type(): string {
        return this.controlType.value;
    }

    public set type(value: string) {
        this.controlType.setValue(value);
    }

    public get required(): string {
        return this.controlRequired.value;
    }

    public get array(): string {
        return this.controlArray.value;
    }

    public get unit(): string {
        return this.controlUnit.value;
    }

    public get enum(): string[] {
        return this.controlEnum.value;
    }

    public get availableOptions(): string[] {
        return this.controlAvailableOptions.value;
    }

    public get color(): string {
        return this.controlColor.value;
    }

    public get size(): string {
        return this.controlSize.value;
    }

    public get bold(): boolean {
        return this.controlBold.value;
    }

    public get isPrivate(): boolean {
        return this.controlPrivate.value;
    }

    public get default(): any {
        return this.controlDefault.value;
    }

    public get suggest(): any {
        return this.controlSuggest.value;
    }

    public get example(): any {
        return this.controlExample.value;
    }

    public createGroup(): UntypedFormGroup {
        return new UntypedFormGroup({
            controlKey: this.controlKey,
            controlTitle: this.controlTitle,
            controlDescription: this.controlDescription,
            fieldType: this.controlType,
            fieldRequired: this.controlRequired,
            fieldArray: this.controlArray,
            fieldUnit: this.controlUnit,
            controlRemoteLink: this.controlRemoteLink,
            controlEnum: this.controlEnum,
            controlAvailableOptions: this.controlAvailableOptions,
            controlColor: this.controlColor,
            controlSize: this.controlSize,
            controlBold: this.controlBold,
            controlPrivate: this.controlPrivate,
            controlPattern: this.controlPattern,
            hidden: this.hidden,
            property: this.property,
            default: this.controlDefault,
            suggest: this.controlSuggest,
            example: this.controlExample,
            autocalculate: this.autocalculated,
            expression: this.expression
        });
    }

    public getValue(formData: any): any {
        const group = formData[this.name];
        if (group) {
            const key = group.controlKey;
            const title = group.controlTitle;
            const description = group.controlDescription;
            const typeIndex = group.fieldType;
            const required = group.fieldRequired;
            const isArray = group.fieldArray;
            const unit = group.fieldUnit;
            const remoteLink = group.controlRemoteLink;
            const enumArray = group.controlEnum;
            const availableOptionsArray = group.controlAvailableOptions;
            const textColor = group.controlColor;
            const textSize = group.controlSize
                ? group.controlSize + 'px'
                : undefined;
            const textBold = group.controlBold;
            const isPrivate = group.controlPrivate;
            const pattern = group.controlPattern;
            const hidden = group.hidden;
            const autocalculate = group.autocalculate;
            const expression = group.expression;
            const property = group.property;
            const suggest = group.suggest;
            const example = group.example;
            return {
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
                default: group.default,
                suggest,
                example,
                autocalculate,
                expression
            };
        } else {
            return null;
        }
    }

    public append(parentControl: UntypedFormGroup) {
        parentControl.addControl(this.name, this.createGroup());
    }

    public remove(parentControl: UntypedFormGroup) {
        parentControl.removeControl(this.name);
    }

    private fieldSystemKeyValidator(): ValidatorFn {
        return (control: any): ValidationErrors | null => {
            let systemFields = SYSTEM_FIELDS;
            if (this._entityType) {
                const entityTypeValue = this._entityType?.value;
                if (entityTypeValue && this._defaultFieldMap && this._defaultFieldMap[entityTypeValue]) {
                    systemFields = systemFields.concat(this._defaultFieldMap[entityTypeValue].map((item: any) => item.name));
                }
            }
            return systemFields.includes(control.value)
                ? { systemName: { valid: false } }
                : null;
        };
    }

    private keyValidator(): ValidatorFn {
        return (control: any): ValidationErrors | null => {
            if (!control.value || /\s/.test(control.value)) {
                return {
                    key: {
                        valid: false
                    }
                };
            }
            return null;
        };
    }

    public isCondition(types: any): boolean {
        if (!this.controlType || !types[this.controlType.value]) {
            return false;
        }
        if (this.controlArray && this.controlArray.value) {
            return false;
        }
        if (!this.controlDescription || !this.controlDescription.value) {
            return false;
        }
        if (types[this.controlType.value].isRef) {
            return false;
        }
        if (types[this.controlType.value].type === 'boolean' && !this.controlRequired.value) {
            return false;
        }
        return true;
    }

    public refreshType(types: any[]) {
        const typeName = this.controlType.value;
        const item = types.find((e) => e.value == typeName);
        this.setType(((item && item.name) || typeName));
    }

    public setType(typeName: string) {
        if (typeName === 'Boolean') {
            this.controlArray.setValue(false);
            this.controlArray.disable();
        } else {
            this.controlArray.enable();
        }

        const _isString = typeName === 'String';
        if (!_isString) {
            this.controlPattern.disable();
        } else {
            this.controlPattern.enable();
        }

        const _helpText = typeName === 'Help Text';
        if (!_helpText) {
            this.controlColor.disable();
            this.controlSize.disable();
            this.controlBold.disable();
        } else {
            this.controlColor.enable();
            this.controlSize.enable();
            this.controlBold.enable();
        }

        const _enum = typeName === 'Enum';
        if (_enum) {
            this.controlEnum.setValidators([Validators.required]);
        } else {
            this.controlEnum.clearValidators();
        }
        this.controlEnum.updateValueAndValidity();
    }
}
