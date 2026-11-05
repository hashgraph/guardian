import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IFormCompletion, ISectionCompletion } from '../schema-form/schema-form-completion';

export interface IRailBadge {
    kind: 'warn' | 'comment';
    count: number;
    tooltip: string;
}

/** A row of the rail. The edit form's sections and the read-only sections both satisfy it. */
export interface IRailSection {
    id: string;
    title: string;
    /** Numbering shown before the title in view mode (mono, muted). */
    prefix?: string;
    /** View mode: the status dot. */
    status?: 'ok' | 'bad' | 'none';
    /** View mode: warning and comment counts. */
    badges?: IRailBadge[];
}

/** A sub-row under the active section. An edit form control satisfies it structurally. */
export interface IRailCard {
    id: string;
    description?: string;
    title?: string;
    name?: string;
}

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
    @Input() sections: IRailSection[] = [];
    /** `view` is the read-only document: no progress summary or rings, badges and a status dot instead. */
    @Input() mode: 'edit' | 'view' = 'edit';
    @Input() title = 'Sections';
    /** The label of the first row; null hides it (a presentation has no Overview of its own). */
    @Input() overviewLabel: string | null = 'Overview';
    @Input() completion: IFormCompletion | null = null;
    @Input() screen: 'overview' | 'section' = 'overview';
    @Input() activeIndex = 0;
    /** Sub-schema cards inside the active section. */
    @Input() cards: IRailCard[] = [];
    @Input() errorsRevealed = false;
    /** The rail is shown in the drawer: "Hide menu" reads "Close". */
    @Input() inDrawer = false;

    @Output() select = new EventEmitter<number | 'overview'>();
    @Output() selectCard = new EventEmitter<IRailCard>();
    @Output() hide = new EventEmitter<void>();

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

    public ringPct(index: number): number {
        const stats = this.stats(index);
        return stats && stats.total ? Math.min(1, stats.answered / stats.total) * 100 : 0;
    }

    public ringState(index: number): 'optional' | 'done' | 'progress' {
        return this.isOptional(index) ? 'optional' : this.isComplete(index) ? 'done' : 'progress';
    }

    public tooltip(index: number): string {
        if (this.mode === 'view') {
            const section = this.sections[index];
            const badges = (section?.badges ?? []).map(item => item.tooltip).filter(Boolean);
            if (badges.length) {
                return badges.join(', ');
            }
            return section?.status === 'ok' ? 'Passed' : section?.status === 'bad' ? 'Failed' : section?.status === 'none' ? 'Not evaluated' : '';
        }
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

    public cardTitle(card: IRailCard): string {
        return card.description || card.title || card.name || '';
    }
}
