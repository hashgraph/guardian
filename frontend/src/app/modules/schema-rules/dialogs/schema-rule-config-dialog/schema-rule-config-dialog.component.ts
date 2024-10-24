import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConditionIf, ConditionRule, FieldRule, FormulaRule, RangeRule } from 'src/app/modules/common/models/field-rule';
import { createAutocomplete } from 'src/app/modules/common/models/lang-modes/autocomplete';

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

    public variables: any[] = [];
    public enums: { [x: string]: string[] } = {};
    public readonly: boolean = false;
    public defaultEnum: string[] = [];

    public codeMirrorOptions: any = {
        theme: 'default',
        mode: 'formula-lang',
        styleActiveLine: false,
        lineNumbers: false,
        lineWrapping: false,
        foldGutter: true,
        gutters: [
            'CodeMirror-lint-markers'
        ],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readOnly: false,
        viewportMargin: Infinity,
        variables: [],
        extraKeys: { "Ctrl-Space": "autocomplete" },
        scrollbarStyle: null,
        singleLine: true,
        placeholder: 'A1 > 0 and A1 < 10'
    };

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig<{
            variables: any[],
            enums: { [x: string]: string[] }
            item: FieldRule,
            readonly?: boolean
        }>,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || new FieldRule();
        this.rule = this.item.rule;
        this.variables = this.config.data?.variables || [];
        this.enums = this.config.data?.enums || {};
        this.readonly = !!this.config.data?.readonly;

        this.template = this.rule?.type || '';
        if (this.template === 'formula') {
            this.formula = this.rule as FormulaRule;
            this.condition = new ConditionRule(this.item);
            this.range = new RangeRule(this.item);
        } else if (this.template === 'range') {
            this.range = this.rule as RangeRule;
            this.formula = new FormulaRule(this.item);
            this.condition = new ConditionRule(this.item);
        } else if (this.template === 'condition') {
            this.condition = this.rule as ConditionRule;
            this.formula = new FormulaRule(this.item);
            this.range = new RangeRule(this.item);
        } else {
            this.formula = new FormulaRule(this.item);
            this.condition = new ConditionRule(this.item);
            this.range = new RangeRule(this.item);
        }

        const all = this.variables.map((o) => o.value);
        this.codeMirrorOptions = {
            ...this.codeMirrorOptions,
            variables: all,
            hintOptions: {
                hint: createAutocomplete(all)
            }
        }

        for (const variable of this.variables) {
            this.enums[variable.value] = this.enums[variable.value] || [];
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
        if (this.template === 'formula') {
            this.ref.close({ rule: this.formula });
        } else if (this.template === 'range') {
            this.ref.close({ rule: this.range });
        } else if (this.template === 'condition') {
            this.ref.close({ rule: this.condition });
        } else {
            this.ref.close(null);
        }

    }

    public addCondition(condition: ConditionRule) {
        condition.addCondition();
    }

    public deleteCondition(condition: ConditionRule, item: ConditionIf) {
        condition.deleteCondition(item)
    }

    public getEnums(variable: string): string[] {
        if (variable) {
            return this.enums[variable];
        } else {
            return this.defaultEnum;
        }

    }
}
