import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { PolicyBlock, SchemaVariables } from '../../structures';

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-schema',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './select-schema.component.html',
    styleUrls: ['./select-schema.component.scss'],
    standalone: false
})
export class SelectSchema {
    @Input('schemas') schemas!: SchemaVariables[];
    @Input('disabled') disabled!: boolean;
    @Input('value') value: string | PolicyBlock | null | undefined;
    @Output('valueChange') valueChange = new EventEmitter<any>();
    @Output('change') change = new EventEmitter<any>();

    @Input('bodyStyleClass') bodyStyleClass: string | undefined;
    @Input('panelStyleClass') panelStyleClass: string | undefined;

    public sortedSchemas: SchemaVariables[] = [];

    constructor() {
    }

    onChange() {
        this.valueChange.emit(this.value);
        this.change.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.schemas) {
            if (!this.schemas) {
                this.sortedSchemas = [];
                return;
            }
            const placeholders = this.schemas.filter((s) => !s.value && !s.data);
            const real = this.schemas.filter((s) => s.value || s.data);
            real.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
            this.sortedSchemas = [...placeholders, ...real];
        }
    }
}
