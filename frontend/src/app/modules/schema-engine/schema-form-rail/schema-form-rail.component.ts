import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IFieldControl } from '../schema-form-model/field-form';
import { IFormCompletion, ISectionCompletion } from '../schema-form/schema-form-completion';
import { IFormSection } from '../schema-form-root/schema-form-sections';

/**
 * The section list of a schema form: overview, one row per section and, under the active
 * section, its sub-schema cards.
 */
@Component({
    selector: 'app-schema-form-rail',
    templateUrl: './schema-form-rail.component.html',
    styleUrls: ['./schema-form-rail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SchemaFormRailComponent {
    @Input() sections: IFormSection[] = [];
    @Input() completion: IFormCompletion | null = null;
    @Input() screen: 'overview' | 'section' = 'overview';
    @Input() activeIndex = 0;
    /** Sub-schema cards inside the active section. */
    @Input() cards: IFieldControl<any>[] = [];
    @Input() errorsRevealed = false;
    /** The rail is shown in the drawer: "Hide menu" reads "Close". */
    @Input() inDrawer = false;

    @Output() select = new EventEmitter<number | 'overview'>();
    @Output() selectCard = new EventEmitter<IFieldControl<any>>();
    @Output() hide = new EventEmitter<void>();

    public readonly ringRadius = 8;
    public readonly ringLength = 2 * Math.PI * this.ringRadius;

    public get answered(): number {
        return this.completion?.answered ?? 0;
    }

    public get total(): number {
        return this.completion?.total ?? 0;
    }

    public get percent(): number {
        return this.total ? Math.round((this.answered / this.total) * 100) : 0;
    }

    public stats(index: number): ISectionCompletion | null {
        return this.completion?.sections[index] ?? null;
    }

    public isComplete(index: number): boolean {
        const stats = this.stats(index);
        return !!stats && stats.total > 0 && stats.answered >= stats.total;
    }

    public isOptional(index: number): boolean {
        const stats = this.stats(index);
        return !!stats && stats.total === 0;
    }

    public showErrorDot(index: number): boolean {
        return this.errorsRevealed && !!this.stats(index)?.hasErrors;
    }

    public ringOffset(index: number): number {
        const stats = this.stats(index);
        const part = stats && stats.total ? Math.min(1, stats.answered / stats.total) : 0;
        return this.ringLength * (1 - part);
    }

    public tooltip(index: number): string {
        const stats = this.stats(index);
        const title = this.sections[index]?.title ?? '';
        if (!stats || stats.total === 0) {
            return `${title} – optional`;
        }
        return `${title} – ${stats.answered} of ${stats.total} required answered`;
    }

    public onKey(event: Event, target: number | 'overview'): void {
        event.preventDefault();
        this.select.emit(target);
    }

    public cardTitle(card: IFieldControl<any>): string {
        return card.description || card.title || card.name;
    }
}
