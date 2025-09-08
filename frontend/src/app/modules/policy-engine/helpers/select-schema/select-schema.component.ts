import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { PolicyBlock, SchemaVariables } from '../../structures';

/**
 * SelectBlock.
 */
@Component({
    selector: 'select-schema',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './select-schema.component.html',
    styleUrls: ['./select-schema.component.scss']
})
export class SelectSchema {
    @Input('schemas') schemas!: SchemaVariables[];
    @Input('disabled') disabled!: boolean;
    @Input('value') value: string | PolicyBlock | null | undefined;
    @Output('valueChange') valueChange = new EventEmitter<any>();
    @Output('change') change = new EventEmitter<any>();

    @Input('bodyStyleClass') bodyStyleClass: string | undefined;
    @Input('panelStyleClass') panelStyleClass: string | undefined;

    constructor() {
    }

    onChange() {
        this.valueChange.emit(this.value);
        this.change.emit();
    }

    ngOnChanges(changes: SimpleChanges) {
    }
}
