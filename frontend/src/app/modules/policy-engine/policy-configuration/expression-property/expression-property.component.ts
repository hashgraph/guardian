import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

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
export class ExpressionPropertyComponent {
    @Input('value') value: any;
    @Input('readonly') readonly: boolean = false;
    @Output('edit') edit = new EventEmitter<MouseEvent>();

    public get empty(): boolean {
        return !this.summary;
    }

    public get label(): string {
        return this.summary || 'Not set';
    }

    /**
     * Full text for the tooltip – the button itself truncates.
     */
    public get title(): string {
        const action = this.readonly ? 'View expression' : 'Edit expression';
        return this.empty ? action : `${this.summary} – ${action.toLowerCase()}`;
    }

    private get summary(): string {
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
        if (!value.trim()) {
            return '';
        }
        const lines = value.split('\n').length;
        return lines === 1 ? '1 line' : `${lines} lines`;
    }

    private static mathSummary(value: any): string {
        const parts: string[] = [];
        ExpressionPropertyComponent.count(parts, value.variables, 'variable');
        ExpressionPropertyComponent.count(parts, value.formulas, 'formula');
        ExpressionPropertyComponent.count(parts, value.outputs, 'output');
        if (!parts.length && typeof value.code === 'string' && value.code.trim()) {
            parts.push(ExpressionPropertyComponent.codeSummary(value.code));
        }
        return parts.join(', ');
    }

    private static count(parts: string[], items: any, name: string): void {
        const size = Array.isArray(items) ? items.length : 0;
        if (size) {
            parts.push(size === 1 ? `1 ${name}` : `${size} ${name}s`);
        }
    }

    public onClick($event: MouseEvent): void {
        this.edit.emit($event);
    }
}
