import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type RingSize = 'sm' | 'md' | 'lg';
export type RingState = 'optional' | 'done' | 'progress';

interface IRingShape {
    box: number;
    radius: number;
    stroke: number;
    dash: string;
    check: string;
}

const SHAPES: Record<RingSize, IRingShape> = {
    sm: { box: 20, radius: 8, stroke: 2.5, dash: 'M7 10h6', check: 'M6 10.3l2.8 2.8L14 7.6' },
    md: { box: 24, radius: 10, stroke: 3, dash: 'M8 12h8', check: 'M7 12.3l3.3 3.3L17 9' },
    lg: { box: 96, radius: 42, stroke: 8, dash: '', check: '' },
};

/**
 * The one progress ring of the schema forms: the rail rows (sm), the Overview cards (md) and the
 * big ring of the edit form's Overview (lg, with the percentage projected into it).
 */
@Component({
    selector: 'app-schema-form-ring',
    templateUrl: './schema-form-ring.component.html',
    styleUrls: ['./schema-form-ring.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SchemaFormRingComponent {
    @Input() size: RingSize = 'sm';
    @Input() state: RingState = 'progress';
    /** Share done, 0 to 100. */
    @Input() pct = 0;

    public get shape(): IRingShape {
        return SHAPES[this.size];
    }

    public get center(): number {
        return this.shape.box / 2;
    }

    public get length(): number {
        return 2 * Math.PI * this.shape.radius;
    }

    public get offset(): number {
        return this.length * (1 - Math.max(0, Math.min(100, this.pct)) / 100);
    }

    public get label(): string {
        return this.state === 'optional' ? 'No required fields' : this.state === 'done' ? 'Complete' : 'In progress';
    }

    public get rotate(): string {
        return `rotate(-90 ${this.center} ${this.center})`;
    }
}
