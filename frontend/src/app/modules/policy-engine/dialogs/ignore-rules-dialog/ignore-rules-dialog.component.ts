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
     */
    public readonly presetRuleOptions: PresetRuleOption[] = [
        {
            key: 'hideAllWarnings',
            label: 'Hide all warnings',
            hint: 'Remove every non-fatal warning from the validation results.',
            rule: { severity: 'warning' },
        },
        {
            key: 'hideAllInfos',
            label: 'Hide all infos',
            hint: 'Remove all informational messages; keep warnings and errors only.',
            rule: { severity: 'info' },
        },
        {
            key: 'hideDeprecatedBlocks',
            label: 'Hide deprecated blocks',
            hint: 'Suppress messages about whole block types being deprecated.',
            rule: { code: 'DEPRECATION_BLOCK' },
        },
        {
            key: 'hideDeprecatedProps',
            label: 'Hide deprecated properties',
            hint: 'Suppress messages about specific properties being deprecated.',
            rule: { code: 'DEPRECATION_PROP' },
        },
        {
            key: 'hideNoIncoming',
            label: 'Hide “no incoming links”',
            hint: 'Suppress reachability warnings for blocks with no incoming links.',
            rule: { code: 'REACHABILITY_NO_IN' },
        },
        {
            key: 'hideNoOutgoing',
            label: 'Hide “no outgoing links”',
            hint: 'Suppress reachability warnings for blocks with no outgoing links.',
            rule: { code: 'REACHABILITY_NO_OUT' },
        },
        {
            key: 'hideIsolated',
            label: 'Hide “isolated block”',
            hint: 'Suppress warnings when a block has no inbound and no outbound links.',
            rule: { code: 'REACHABILITY_ISOLATED' }
        },
    ];

    public header = 'Policy Warnings'

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
     * Clear — sets all toggles in the form to `false`.
     */
    public clearAll(): void {
        Object.keys(this.form.controls).forEach(key => this.form.get(key)?.setValue(false));
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
