import { Component } from '@angular/core';
import { SchemaField } from '@guardian/interfaces';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConditionIf, ConditionRule, FieldRule, FormulaRule, RangeRule } from 'src/app/modules/common/models/field-rule';
import { createAutocomplete } from 'src/app/modules/common/models/lang-modes/autocomplete';
import { IPFSService } from 'src/app/services/ipfs.service';

export class EnumValue {
    public loaded: boolean = false;
    public values: string[];
    public link: string;
    public default: boolean = true;
    public items: any[];

    private ipfs?: IPFSService;

    constructor(ipfs?: IPFSService, field?: SchemaField) {
        if (field) {
            this.ipfs = ipfs;
            if (field.remoteLink) {
                this.default = false;
                this.loaded = false;
                this.link = field.remoteLink;
                this.setValue([]);
                this.loadValues();
            } else if (field.enum) {
                this.default = false;
                this.loaded = true;
                this.setValue(field.enum);
            }
        } else {
            this.loaded = true;
            this.setValue([]);
        }
    }

    private loadValues() {
        if (this.ipfs && this.link) {
            this.ipfs
                .getJsonFileByLink(this.link)
                .then((res: any) => {
                    this.setValue(res.enum);
                })
                .finally(() => this.loaded = true);
        }
    }

    private setValue(value: string[]) {
        this.values = value || [];
        this.items = [];
        for (const item of this.values) {
            this.items.push({ label: item, value: item })
        }
    }
}


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
    public enumVariables: any[] = [];
    public enums: { [x: string]: EnumValue } = {};
    public readonly: boolean = false;
    public defaultEnum: EnumValue = new EnumValue();

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
            enums: { [x: string]: EnumValue }
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

        this.enumVariables = [];
        for (const variable of this.variables) {
            this.enumVariables.push({
                ...variable,
                disabled: (!this.enums[variable.value] || this.enums[variable.value].default)
            });
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

    public getEnums(variable: string): EnumValue {
        if (variable && this.enums[variable]) {
            return this.enums[variable];
        }
        return this.defaultEnum;
    }
}
