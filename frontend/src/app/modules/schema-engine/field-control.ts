import { FormArray, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SchemaField } from '@guardian/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export const SYSTEM_FIELDS = [
    '@context',
    'type',
]

export class FieldControl {
    public readonly name: string;

    public controlKey: FormControl;
    public controlTitle: FormControl;
    public hidden: FormControl;
    public controlDescription: FormControl;
    public controlType: FormControl;
    public property: FormControl;
    public controlRequired: FormControl;
    public controlArray: FormControl;
    public controlUnit: FormControl;
    public controlRemoteLink: FormControl;
    public controlEnum: FormArray;
    public controlColor: FormControl;
    public controlSize: FormControl;
    public controlBold: FormControl;
    public controlPrivate: FormControl;
    public controlPattern: FormControl;
    private readonly _defaultFieldMap!: any;
    private _entityType: FormControl | undefined;

    constructor(
        field: SchemaField | null,
        type: string,
        destroyEvent: Subject<any>,
        defaultFieldMap: any,
        entityType?: FormControl,
        name?: string
    ) {
        this._defaultFieldMap = defaultFieldMap;
        this._entityType = entityType;
        this.name = `field${Date.now()}${Math.floor(Math.random() * 1000000)}`;
        if (field) {
            this.controlKey = new FormControl(field.name, [
                Validators.required,
                this.keyValidator(),
                this.fieldSystemKeyValidator()
            ]);
            this.controlKey.valueChanges
                .pipe(takeUntil(destroyEvent))
                .subscribe(this.trimFormControlValue.bind(this));
            this.controlTitle = new FormControl(field.title, Validators.required);
            this.controlDescription = new FormControl(field.description, Validators.required);
            this.controlType = new FormControl(type, Validators.required);
            this.controlRequired = new FormControl(field.required);
            this.controlArray = new FormControl(field.isArray);
            this.controlUnit = new FormControl(field.unit);
            this.controlRemoteLink = new FormControl(field.remoteLink);
            this.controlPrivate = new FormControl(field.isPrivate || false);
            this.controlEnum = new FormArray([]);
            this.hidden = new FormControl(!!field.hidden);
            this.property = new FormControl(field.property || '');
            field.enum?.forEach(item => {
                this.controlEnum.push(new FormControl(item))
            });
            this.controlColor = new FormControl(field.textColor || '#000000');
            this.controlSize = new FormControl(field.textSize && +field.textSize.replace('px', '') || 18);
            this.controlBold = new FormControl(field.textBold || false);
            this.controlPattern = new FormControl(field.pattern);
        } else {
            this.controlKey = new FormControl(name || this.name, [
                Validators.required,
                this.keyValidator(),
                this.fieldSystemKeyValidator()
            ]);
            this.controlKey.valueChanges
                .pipe(takeUntil(destroyEvent))
                .subscribe(this.trimFormControlValue.bind(this));
            this.controlTitle = new FormControl(name || this.name, Validators.required);
            this.controlDescription = new FormControl('', Validators.required);
            this.controlType = new FormControl(type, Validators.required);
            this.controlRequired = new FormControl(false);
            this.controlArray = new FormControl(false);
            this.controlUnit = new FormControl('');
            this.controlRemoteLink = new FormControl('');
            this.controlEnum = new FormArray([]);
            this.controlColor = new FormControl('#000000');
            this.controlSize = new FormControl(18);
            this.controlBold = new FormControl(false);
            this.controlPrivate = new FormControl(false);
            this.controlPattern = new FormControl('');
            this.hidden = new FormControl(false);
            this.property = new FormControl('');
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

    public createGroup(): FormGroup {
        return new FormGroup({
            controlKey: this.controlKey,
            controlTitle: this.controlTitle,
            controlDescription: this.controlDescription,
            fieldType: this.controlType,
            fieldRequired: this.controlRequired,
            fieldArray: this.controlArray,
            fieldUnit: this.controlUnit,
            controlRemoteLink: this.controlRemoteLink,
            controlEnum: this.controlEnum,
            controlColor: this.controlColor,
            controlSize: this.controlSize,
            controlBold: this.controlBold,
            controlPrivate: this.controlPrivate,
            controlPattern: this.controlPattern,
            hidden: this.hidden,
            property: this.property,
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
            const textColor = group.controlColor;
            const textSize = group.controlSize
                ? group.controlSize + 'px'
                : undefined;
            const textBold = group.controlBold;
            const isPrivate = group.controlPrivate;
            const pattern = group.controlPattern;
            const hidden = group.hidden;
            const property = group.property;
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
                textColor,
                textSize,
                textBold,
                isPrivate,
                pattern,
                hidden,
                property
            };
        } else {
            return null;
        }
    }

    public append(parentControl: FormGroup) {
        parentControl.addControl(this.name, this.createGroup());
    }

    public remove(parentControl: FormGroup) {
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
}
