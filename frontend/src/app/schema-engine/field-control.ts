import {
    FormControl,
    FormGroup, ValidationErrors, ValidatorFn, Validators
} from '@angular/forms';
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
    public controlDescription: FormControl;
    public controlType: FormControl;
    public controlRequired: FormControl;
    public controlArray: FormControl;
    public controlUnit: FormControl;
    private readonly _defaultFieldMap!: any;
    private _entityType!: FormControl;

    constructor(
        field: SchemaField | null,
        type: string,
        destroyEvent: Subject<any>,
        defaultFieldMap: any,
        entityType: FormControl,
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
        }
        this._entityType.valueChanges
            .pipe(takeUntil(destroyEvent))
            .subscribe(() => this.controlKey.updateValueAndValidity());
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

    public createGroup(): FormGroup {
        return new FormGroup({
            controlKey: this.controlKey,
            controlTitle: this.controlTitle,
            controlDescription: this.controlDescription,
            fieldType: this.controlType,
            fieldRequired: this.controlRequired,
            fieldArray: this.controlArray,
            fieldUnit: this.controlUnit,
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
            return {
                key,
                title,
                description,
                typeIndex,
                required,
                isArray,
                unit
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
            const entityTypeValue = this._entityType?.value;
            if (entityTypeValue && this._defaultFieldMap && this._defaultFieldMap[entityTypeValue]) {
                systemFields = systemFields.concat(this._defaultFieldMap[entityTypeValue].map((item: any) => item.name));
            }
            return systemFields.includes(control.value)
                ? { systemName: { valid: false }}
                : null;
        };
    }

    private keyValidator(): ValidatorFn {
        return (control: any): ValidationErrors | null => {
            if(!control.value || /\s/.test(control.value)) {
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
