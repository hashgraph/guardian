import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IgnoreRule } from '@guardian/interfaces';

interface PresetRuleOption {
    key: string;
    label: string;
    hint?: string;
    rule: IgnoreRule;
}

/**
 * Ignore Rules configuration dialog:
 * - Shows a list of predefined rule presets.
 * - Each item has a Yes/No toggle (default: No).
 * - Does not persist anything by itself — returns out:
 *   • IgnoreRule[] array on Save
 *   • string 'clear' on Clear
 *   • null on Cancel
 */
@Component({
    selector: 'app-ignore-rules-dialog',
    templateUrl: './ignore-rules-dialog.component.html',
    styleUrls: ['./ignore-rules-dialog.component.scss'],
})
export class IgnoreRulesDialog implements OnInit {
    public form!: FormGroup;

    /**
     * Available presets to enable.
     * To add a new item — extend this array.
     */
    public readonly presetRuleOptions: PresetRuleOption[] = [
        {
            key: 'suppressWarnings',
            label: 'Hide warnings (kind = "warning")',
            rule: { kind: 'warning' },
        },
        {
            key: 'skipEmptyProperties',
            label: 'Ignore empty properties',
            hint: 'Drop validations for empty/absent values',
            rule: { property: 'empty' },
        },
        {
            key: 'skipUiBlocks',
            label: 'Ignore UI blocks',
            rule: { blockType: 'UI' },
        },
        {
            key: 'skipServerBlocks',
            label: 'Ignore server blocks',
            rule: { blockType: 'Server' },
        },
        {
            key: 'excludeDeprecated',
            label: 'Exclude deprecated items',
            rule: { contains: 'deprecated' },
        },
    ];

    constructor(
        private readonly formBuilder: FormBuilder,
        public readonly dialogRef: DynamicDialogRef,
        public readonly dialogConfig: DynamicDialogConfig
    ) {}

    public ngOnInit(): void {
        const initialRules: IgnoreRule[] = Array.isArray(this.dialogConfig.data?.rules)
            ? (this.dialogConfig.data.rules as IgnoreRule[])
            : [];

        const initialControlState: Record<string, boolean> = {};

        for (const option of this.presetRuleOptions) {
            initialControlState[option.key] = this.containsRule(initialRules, option.rule);
        }

        this.form = this.formBuilder.group(initialControlState);
    }

    /**
     * Save currently enabled items as IgnoreRule[].
     */
    public save(): void {
        const formValue: Record<string, boolean> =
            this.form.getRawValue() as Record<string, boolean>;

        const enabledKeys: string[] = Object
            .keys(formValue)
            .filter((key) => Boolean(formValue[key]));

        const resultRules: IgnoreRule[] = this.presetRuleOptions
            .filter((option) => enabledKeys.includes(option.key))
            .map((option) => option.rule);

        this.dialogRef.close(resultRules);
    }

    /**
     * Clear — recognized by the outer code via the 'clear' marker.
     */
    public clearAll(): void {
        this.dialogRef.close('clear');
    }

    /**
     * Close without changes.
     */
    public close(): void {
        this.dialogRef.close(null);
    }

    /**
     * Set Yes/No value for a particular item.
     * Implemented as a method (not inline in the template) — cleaner and easier to test.
     */
    public setOptionValue(
        key: string,
        value: boolean
    ): void {
        const control = this.form.get(key);
        if (control) {
            control.setValue(value);
        }
    }

    /**
     * Checks whether the given rule exists in the array.
     * Equality is based on matching all defined (non-empty) fields.
     */
    private containsRule(
        rules: IgnoreRule[],
        expected: IgnoreRule
    ): boolean {
        return rules.some((candidate) => this.areRulesEqual(candidate, expected));
    }

    private areRulesEqual(
        a: IgnoreRule,
        b: IgnoreRule
    ): boolean {
        const normalize = (rule: IgnoreRule): string => {
            const entries: Array<[string, unknown]> = Object
                .entries(rule as Record<string, unknown>)
                .filter(([, value]) =>
                    value !== undefined &&
                    value !== null &&
                    (typeof value !== 'string' || value.trim() !== '')
                );

            entries.sort((e1, e2) => e1[0].localeCompare(e2[0]));

            return JSON.stringify(Object.fromEntries(entries));
        };

        return normalize(a) === normalize(b);
    }

    public trackByOptionKey(
        index: number,
        option: PresetRuleOption
    ): string {
        return option.key;
    }
}
