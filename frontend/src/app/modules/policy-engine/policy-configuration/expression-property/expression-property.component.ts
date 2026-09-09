import { Component, EventEmitter, Input, OnChanges, Output, ViewEncapsulation } from '@angular/core';

/**
 * Trigger for the "Expression" property.
 * Shows whether the expression is set and a short summary of its content,
 * instead of dumping the raw source (or an object) into a text input.
 */
@Component({
    selector: 'expression-property',
    templateUrl: './expression-property.component.html',
    styleUrls: ['./expression-property.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
    standalone: false
})
export class ExpressionPropertyComponent implements OnChanges {
    @Input('value') value: any;
    @Input('readonly') readonly: boolean = false;
    @Output('edit') edit = new EventEmitter<MouseEvent>();

    /**
     * Summarising the expression walks its whole source, so it is computed
     * when the inputs change rather than on every change detection pass.
     */
    public empty: boolean = true;
    public label: string = 'Not set';
    public title: string = '';

    public ngOnChanges(): void {
        const summary = this.summarize();
        const action = this.readonly ? 'View expression' : 'Edit expression';
        this.empty = !summary;
        this.label = summary || 'Not set';
        this.title = summary ? `${summary} – ${action.toLowerCase()}` : action;
    }

    private summarize(): string {
        const value = this.value;
        if (!value) {
            return '';
        }
        if (typeof value === 'string') {
            return ExpressionPropertyComponent.codeSummary(value);
        }
        if (typeof value === 'object') {
            return ExpressionPropertyComponent.mathSummary(value);
        }
        return '';
    }

    private static codeSummary(value: string): string {
        if (!value) {
            return '';
        }
        // Validation only rejects a falsy expression, so whitespace counts as
        // set - reporting it as empty would contradict the validator.
        const lines = value.split('\n').length;
        return lines === 1 ? '1 line' : `${lines} lines`;
    }

    private static mathSummary(value: any): string {
        const parts: string[] = [];
        ExpressionPropertyComponent.count(parts, value.variables, 'variable');
        ExpressionPropertyComponent.count(parts, value.formulas, 'formula');
        ExpressionPropertyComponent.count(parts, value.outputs, 'output');
        if (!parts.length && typeof value.code === 'string' && value.code) {
            parts.push(ExpressionPropertyComponent.codeSummary(value.code));
        }
        return parts.join(', ');
    }

    private static count(parts: string[], groups: any, name: string): void {
        const size = ExpressionPropertyComponent.leaves(groups);
        if (size) {
            parts.push(size === 1 ? `1 ${name}` : `${size} ${name}s`);
        }
    }

    /**
     * Variables, formulas and outputs are stored as an array of tabs, each
     * holding the items - counting the array itself only ever counts tabs.
     */
    private static leaves(items: any): number {
        if (!Array.isArray(items)) {
            return 0;
        }
        return items.reduce((sum: number, item: any) => {
            return sum + (item && Array.isArray(item.items)
                ? ExpressionPropertyComponent.leaves(item.items)
                : 1);
        }, 0);
    }

    public onClick($event: MouseEvent): void {
        this.edit.emit($event);
    }
}
