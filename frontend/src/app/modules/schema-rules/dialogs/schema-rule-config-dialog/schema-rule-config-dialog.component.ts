import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConditionIf, ConditionRule, FieldRule, FormulaRule, RangeRule } from 'src/app/modules/common/models/field-rule';

@Component({
    selector: 'schema-rule-config-dialog',
    templateUrl: './schema-rule-config-dialog.component.html',
    styleUrls: ['./schema-rule-config-dialog.component.scss'],
})
export class SchemaRuleConfigDialog {
    public loading = true;
    public item: FieldRule;
    public templates: any[] = [{
        label: 'None',
        value: ''
    }, {
        label: 'Formula',
        value: 'formula'
    }, {
        label: 'Range',
        value: 'range'
    }, {
        label: 'Condition',
        value: 'condition'
    }];
    public template: string;
    public rule: FormulaRule | ConditionRule | RangeRule | undefined;
    public formula: FormulaRule;
    public condition: ConditionRule;
    public range: RangeRule;

    public conditionTypes: any[] = [{
        label: 'Formula',
        value: 'formula'
    }, {
        label: 'Range',
        value: 'range'
    }, {
        label: 'Text',
        value: 'text'
    }, {
        label: 'Enum',
        value: 'enum'
    }];

    public valueTypes: any[] = [{
        label: 'Formula',
        value: 'formula'
    }, {
        label: 'Range',
        value: 'range'
    }, {
        label: 'Text',
        value: 'text'
    }];

    public variables: string[] = ['A1', 'A2', 'A3'];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || new FieldRule();
        this.rule = this.item.rule;
        this.template = this.rule?.type || '';
        if (this.template === 'formula') {
            this.formula = this.rule as FormulaRule;
            this.condition = new ConditionRule(this.item);
            this.range = new RangeRule(this.item);
        } else if (this.template === 'range') {
            this.formula = new FormulaRule(this.item);
            this.condition = this.rule as ConditionRule;
            this.range = new RangeRule(this.item);
        } else if (this.template === 'condition') {
            this.formula = new FormulaRule(this.item);
            this.condition = new ConditionRule(this.item);
            this.range = this.rule as RangeRule;
        } else {
            this.formula = new FormulaRule(this.item);
            this.condition = new ConditionRule(this.item);
            this.range = new RangeRule(this.item);
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onSelectTemplate() {
        // debugger
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit() {
        this.ref.close({});
    }

    // public onChangeConditionType(condition: any, value: any) {
    //     debugger;
    // }

    public addCondition(condition: ConditionRule) {
        condition.addCondition();
    }

    public deleteCondition(condition: ConditionRule, item: ConditionIf) {
        condition.deleteCondition(item)
    }
}
