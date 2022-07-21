import {
    FormControl,
    FormGroup, Validators
} from '@angular/forms';
import { SchemaField } from '@guardian/interfaces';


export class FieldControl {
    public readonly name: string;
    
    public controlKey: FormControl;
    public controlTitle: FormControl;
    public controlDescription: FormControl;
    public controlType: FormControl;
    public controlRequired: FormControl;
    public controlArray: FormControl;
    public controlUnit: FormControl;

    constructor(field: SchemaField | null, type: string, name?: string) {
        this.name = "field" + Date.now();

        if (field) {
            this.controlKey = new FormControl(field.name, Validators.required);
            this.controlTitle = new FormControl(field.title, Validators.required);
            this.controlDescription = new FormControl(field.description, Validators.required);
            this.controlType = new FormControl(type, Validators.required);
            this.controlRequired = new FormControl(field.required);
            this.controlArray = new FormControl(field.isArray);
            this.controlUnit = new FormControl(field.unit);
        } else {
            this.controlKey = new FormControl(name || this.name, Validators.required);
            this.controlTitle = new FormControl(name || this.name, Validators.required);
            this.controlDescription = new FormControl('', Validators.required);
            this.controlType = new FormControl(type, Validators.required);
            this.controlRequired = new FormControl(false);
            this.controlArray = new FormControl(false);
            this.controlUnit = new FormControl('');
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
}
