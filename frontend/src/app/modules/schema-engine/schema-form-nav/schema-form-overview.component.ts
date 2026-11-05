import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IRailBadge } from '../schema-form-rail/schema-form-rail.component';

export interface IOverviewTile {
    value: string;
    label: string;
    tone?: 'warn' | 'bad' | 'ok';
}

export interface IOverviewCard {
    id: string;
    title: string;
    prefix?: string;
    meta?: string;
    /** Share of the bar under the meta line, 0 to 100. */
    fill?: number;
    ring?: { pct: number; done: boolean; optional: boolean };
    status?: 'ok' | 'bad' | 'none';
    badges?: IRailBadge[];
    pill?: { text: string; tone?: string };
    action: string;
}

/**
 * The Overview page of every host of the section navigation. The host projects its header
 * (`[overviewHead]`) and, for the read-only view, the Location panel (`[overviewExtra]`).
 */
@Component({
    selector: 'app-schema-form-overview',
    templateUrl: './schema-form-overview.component.html',
    styleUrls: ['./schema-form-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SchemaFormOverviewComponent {
    @Input() tiles: IOverviewTile[] = [];
    @Input() cards: IOverviewCard[] = [];
    @Input() footerLink: string | null = null;
    /** The host can't be used right now (Preview is busy). */
    @Input() locked = false;

    @Output() open = new EventEmitter<number>();
    @Output() footer = new EventEmitter<void>();
}
