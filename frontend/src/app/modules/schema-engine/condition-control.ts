import {
    FormControl,
    FormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { FieldControl } from './field-control';


export class ConditionControl {
    public readonly name: string;

    public thenControls: FieldControl[];
    public elseControls: FieldControl[];
    public readonly thenFieldControls: FormGroup;
    public readonly elseFieldControls: FormGroup;
    public readonly field: FormControl;
    public readonly fieldValue: FormControl;
    public changeEvents: any[] | null = null;
    public fieldChange: Subscription | null = null;

    constructor(field: FieldControl | undefined, fieldValue: string) {
        this.name = `condition${Date.now()}${Math.floor(Math.random() * 1000000)}`;


        this.thenControls = [];
        this.elseControls = [];
        this.thenFieldControls = new FormGroup({});
        this.elseFieldControls = new FormGroup({});

        this.field = new FormControl(field, Validators.required);
        this.fieldValue = new FormControl(fieldValue, Validators.required);
    }

    public get fieldControl(): FieldControl | undefined {
        return this.field?.value
    }

    public createGroup(): FormGroup {
        return new FormGroup({
            ifCondition: new FormGroup({
                field: this.field,
                fieldValue: this.fieldValue
            }),
            thenFieldControls: this.thenFieldControls,
            elseFieldControls: this.elseFieldControls
        }, this.countThenElseFieldsValidator());
    }

    public addThenControl(control: FieldControl) {
        control.append(this.thenFieldControls);
        this.thenControls.push(control);
    }

    public addElseControl(control: FieldControl) {
        control.append(this.elseFieldControls);
        this.elseControls.push(control);
    }

    public addControl(type: 'then' | 'else', control: FieldControl) {
        if (type == 'then') {
            this.addThenControl(control);
        } else {
            this.addElseControl(control);
        }
    }

    public removeThenControl(control: FieldControl) {
        control.remove(this.thenFieldControls);
        this.thenControls = this.thenControls.filter((e: any) => e !== control);
    }

    public removeElseControl(control: FieldControl) {
        control.remove(this.elseFieldControls);
        this.elseControls = this.elseControls.filter((e: any) => e !== control);
    }

    public removeControl(type: 'then' | 'else', control: FieldControl) {
        if (type == 'then') {
            this.removeThenControl(control);
        } else {
            this.removeElseControl(control);
        }
    }

    private countThenElseFieldsValidator(): ValidatorFn {
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
}
