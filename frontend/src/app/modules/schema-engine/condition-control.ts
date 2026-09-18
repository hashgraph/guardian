import {
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { FieldControl } from './field-control';

export type IfOperator = 'SINGLE' | 'AND' | 'OR';

export interface ConditionFieldOption {
    key: string;
    label: string;
    shortLabel?: string;
    fieldPath: string[];
    typeKey: string;
    required: boolean;
    fieldControl?: FieldControl;
}

export interface ConditionFieldGroup {
    label: string;
    items: ConditionFieldOption[];
}

export class ConditionControl {
    public readonly name: string;

    public thenControls: FieldControl[];
    public elseControls: FieldControl[];
    public readonly thenFieldControls: UntypedFormGroup;
    public readonly elseFieldControls: UntypedFormGroup;

    public crossThenTargets: ConditionFieldOption[] = [];
    public crossElseTargets: ConditionFieldOption[] = [];
    public readonly crossThenCount: UntypedFormControl;
    public readonly crossElseCount: UntypedFormControl;

    public readonly conditions: UntypedFormArray;

    public readonly operator: UntypedFormControl;

    public changeEvents: any[] | null = null;
    public fieldChange: Subscription | null = null;

    constructor(field?: ConditionFieldOption, fieldValue: string = '', operator: IfOperator = 'SINGLE') {
        this.name = `condition${Date.now()}${Math.floor(Math.random() * 1000000)}`;

        this.thenControls = [];
        this.elseControls = [];
        this.thenFieldControls = new UntypedFormGroup({});
        this.elseFieldControls = new UntypedFormGroup({});
        this.crossThenCount = new UntypedFormControl(0);
        this.crossElseCount = new UntypedFormControl(0);

        this.operator = new UntypedFormControl(operator, Validators.required);
        this.conditions = new UntypedFormArray([], this.dynamicConditionsValidator());

        if (field) {
            this.addCondition(field, fieldValue);
        } else {
            this.addCondition(undefined, '');
        }
    }

    public addCrossThenTarget(option: ConditionFieldOption): void {
        const key = option.fieldPath.join('.');
        if (!this.crossThenTargets.find(t => t.fieldPath.join('.') === key)) {
            this.crossThenTargets = [...this.crossThenTargets, option];
            this.crossThenCount.setValue(this.crossThenTargets.length);
        }
    }

    public removeCrossThenTarget(option: ConditionFieldOption): void {
        const key = option.fieldPath.join('.');
        this.crossThenTargets = this.crossThenTargets.filter(t => t.fieldPath.join('.') !== key);
        this.crossThenCount.setValue(this.crossThenTargets.length);
    }

    public addCrossElseTarget(option: ConditionFieldOption): void {
        const key = option.fieldPath.join('.');
        if (!this.crossElseTargets.find(t => t.fieldPath.join('.') === key)) {
            this.crossElseTargets = [...this.crossElseTargets, option];
            this.crossElseCount.setValue(this.crossElseTargets.length);
        }
    }

    public removeCrossElseTarget(option: ConditionFieldOption): void {
        const key = option.fieldPath.join('.');
        this.crossElseTargets = this.crossElseTargets.filter(t => t.fieldPath.join('.') !== key);
        this.crossElseCount.setValue(this.crossElseTargets.length);
    }

    public get fieldControl(): ConditionFieldOption | undefined {
        const g = this.conditions.at(0) as UntypedFormGroup;
        return g ? (g.get('field') as UntypedFormControl)?.value : undefined;
    }
    public get field(): UntypedFormControl {
        const g = this.conditions.at(0) as UntypedFormGroup;
        return g.get('field') as UntypedFormControl;
    }
    public get fieldValue(): UntypedFormControl {
        const g = this.conditions.at(0) as UntypedFormGroup;
        return g.get('fieldValue') as UntypedFormControl;
    }

    public createGroup(): UntypedFormGroup {
        return new UntypedFormGroup({
            ifCondition: new UntypedFormGroup({
                operator: this.operator,
                conditions: this.conditions
            }),
            thenFieldControls: this.thenFieldControls,
            elseFieldControls: this.elseFieldControls,
            crossThenCount: this.crossThenCount,
            crossElseCount: this.crossElseCount,
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
        type === 'then' ? this.addThenControl(control) : this.addElseControl(control);
    }
    public removeThenControl(control: FieldControl) {
        control.remove(this.thenFieldControls);
        this.thenControls = this.thenControls.filter(e => e !== control);
    }
    public removeElseControl(control: FieldControl) {
        control.remove(this.elseFieldControls);
        this.elseControls = this.elseControls.filter(e => e !== control);
    }
    public removeControl(type: 'then' | 'else', control: FieldControl) {
        type === 'then' ? this.removeThenControl(control) : this.removeElseControl(control);
    }

    public addCondition(option?: ConditionFieldOption, fieldValue: string = '') {
        const group = new UntypedFormGroup({
            field: new UntypedFormControl(option, Validators.required),
            fieldValue: new UntypedFormControl(fieldValue, Validators.required),
            fieldPath: new UntypedFormControl(option?.fieldPath ?? null),
        });
        this.conditions.push(group);
        this.conditions.updateValueAndValidity();
    }
    public removeCondition(index: number) {
        if (index >= 0 && index < this.conditions.length) {
            this.conditions.removeAt(index);
        }
        if (this.conditions.length === 0) {
            this.addCondition(undefined, '');
        }
        this.conditions.updateValueAndValidity();
    }
    public clearConditions(leaveOneEmpty: boolean = false) {
        while (this.conditions.length) {
            this.conditions.removeAt(0);
        }
        if (leaveOneEmpty) {
            this.addCondition(undefined, '');
        }
        this.conditions.updateValueAndValidity();
    }

    public normalizeByOperator() {
        const op = this.operator.value as IfOperator;
        if (op === 'SINGLE' && this.conditions.length > 1) {
            while (this.conditions.length > 1) {
                this.conditions.removeAt(this.conditions.length - 1);
            }
        }
        this.conditions.updateValueAndValidity();
    }

    private countThenElseFieldsValidator(): ValidatorFn {
        return (group: any): ValidationErrors | null => {
            const thenFieldControls = group.controls.thenFieldControls as UntypedFormGroup;
            const elseFieldControls = group.controls.elseFieldControls as UntypedFormGroup;
            const crossThen: number = (group.controls.crossThenCount as UntypedFormControl)?.value || 0;
            const crossElse: number = (group.controls.crossElseCount as UntypedFormControl)?.value || 0;
            if (
                Object.keys(thenFieldControls.controls).length > 0 ||
                Object.keys(elseFieldControls.controls).length > 0 ||
                crossThen > 0 ||
                crossElse > 0
            ) {
                return null;
            }
            return { noConditionFields: { valid: false } };
        };
    }

    private dynamicConditionsValidator(): ValidatorFn {
        return (arr: any): ValidationErrors | null => {
            const opCtrl = (arr.parent as UntypedFormGroup)?.get('operator') as UntypedFormControl;
            const op: IfOperator = opCtrl?.value || 'SINGLE';
            const len = arr.length;
            if (op === 'SINGLE') {
                return len === 1 ? null : { singleMustBeOne: true };
            }
            return len >= 2 ? null : { needAtLeastTwo: true };
        };
    }
}
