import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';

/**
 * Text input for a schema field path with suggestions from the known paths and an optional
 * browse button. Shared by the Math block editor and the formulas editor.
 */
@Component({
    selector: 'schema-path-input',
    templateUrl: './schema-path-input.component.html',
    styleUrls: ['./schema-path-input.component.scss'],
    standalone: false
})
export class SchemaPathInputComponent implements OnDestroy {
    private static readonly MAX_SUGGESTIONS = 10;

    /** Current path. */
    @Input() value: string | null = '';
    /** Known paths, used for suggestions and the "not found" warning. */
    @Input() paths: ReadonlySet<string> | ReadonlyMap<string, unknown> | null = null;
    @Input() readonly = false;
    @Input() placeholder = 'Path';
    /** Shows the browse button. */
    @Input() browse = true;
    /** An empty value is flagged, the path has to be set. */
    @Input() required = false;
    /** Shows the warning under the input. */
    @Input() showWarning = true;

    @Output() valueChange = new EventEmitter<string>();
    @Output() browseClick = new EventEmitter<void>();

    public suggestions: string[] = [];
    private blurTimer: ReturnType<typeof setTimeout> | undefined;

    public get empty(): boolean {
        return this.required && !this.value;
    }

    public get unknown(): boolean {
        return !!this.value && !!this.paths && !this.paths.has(this.value);
    }

    public onInput(value: string): void {
        this.value = value;
        this.valueChange.emit(value);
        this.updateSuggestions();
    }

    public onSelect(path: string): void {
        this.onInput(path);
        this.suggestions = [];
    }

    public onKeyup(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.suggestions = [];
        }
    }

    public onBlur(): void {
        // lets a click on a suggestion happen first
        if (this.suggestions.length) {
            clearTimeout(this.blurTimer);
            this.blurTimer = setTimeout(() => this.suggestions = [], 200);
        }
    }

    public ngOnDestroy(): void {
        clearTimeout(this.blurTimer);
    }

    private updateSuggestions(): void {
        const prefix = this.value || '';
        if (!prefix || !this.paths) {
            this.suggestions = [];
            return;
        }
        const paths = this.paths instanceof Map ? this.paths.keys() : this.paths;
        this.suggestions = Array.from(paths)
            .filter((path) => path.includes(prefix))
            .sort((a, b) => a.length - b.length)
            .slice(0, SchemaPathInputComponent.MAX_SUGGESTIONS);
    }
}
