import {
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IStep } from '../../structures';
import { ActiveStep, PolicyProgressService } from '../../services/policy-progress.service';

export type StepState = 'active' | 'passed' | 'reach' | 'locked';

/**
 * Policy navigation: a rail of steps (a step bar with a drawer on narrow screens).
 */
@Component({
    selector: 'progress-tracker',
    templateUrl: './progress-tracker.component.html',
    styleUrls: ['./progress-tracker.component.scss'],
    standalone: false
})
export class ProgressTrackerComponent implements OnInit, OnChanges, OnDestroy {
    @Input('steps') steps!: IStep[];
    @Input() hidden: boolean = false;
    @Output() hiddenChange = new EventEmitter<boolean>();
    @Output() activeStepChange = new EventEmitter<ActiveStep | null>();

    activeSteps: IStep[] = [];
    drawerOpen: boolean = false;
    currentLabel: string = '';
    currentSubLabel: string = '';

    private lastActive?: ActiveStep;
    private destroy$ = new Subject<void>();

    constructor(
        private policyProgressService: PolicyProgressService,
        private changeDetector: ChangeDetectorRef
    ) {
    }

    ngOnInit(): void {
        this.policyProgressService.data$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.refresh();
                this.changeDetector.detectChanges();
            });
    }

    ngOnChanges(changes: any): void {
        if (changes.steps && !changes.steps.firstChange) {
            this.refresh();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private refresh(): void {
        const ids = new Set<string>();
        document.querySelectorAll('[block-uuid]').forEach((block) => {
            ids.add(block.getAttribute('block-uuid') as string);
        });
        this.activeSteps = (this.steps || []).filter((step) => ids.has(step.blockId));

        const last = this.activeSteps[this.activeSteps.length - 1];
        if (!last) {
            this.currentLabel = '';
            this.currentSubLabel = '';
            this.emitActive(null);
            return;
        }
        const parent = this.getParent(last);
        this.currentLabel = parent ? parent.label : last.label;
        this.currentSubLabel = parent ? last.label : '';
        const active: ActiveStep = parent
            ? { label: last.label, parentLabel: parent.label }
            : { label: last.label };
        this.emitActive(active);
    }

    private emitActive(active: ActiveStep | null): void {
        if (active?.label === this.lastActive?.label && active?.parentLabel === this.lastActive?.parentLabel) {
            return;
        }
        this.lastActive = active ?? undefined;
        this.policyProgressService.setActiveStep(active);
        Promise.resolve().then(() => this.activeStepChange.emit(active));
    }

    private getParent(step: IStep): IStep | undefined {
        if (step.level <= 1) {
            return undefined;
        }
        for (let i = step.index - 1; i >= 0; i--) {
            if (this.steps[i]?.level <= 1) {
                return this.steps[i];
            }
        }
        return undefined;
    }

    isStepCompleted(step: IStep): boolean {
        return !!this.activeSteps.find(activeStep => activeStep?.index > step?.index);
    }

    isStepActive(step: IStep): boolean {
        return !!this.activeSteps.find(activeStep => activeStep?.blockId === step?.blockId);
    }

    stepHasAction(blockId: string): boolean {
        return this.policyProgressService.stepHasAction(blockId);
    }

    getState(step: IStep): StepState {
        if (this.isStepActive(step)) {
            return 'active';
        }
        const reach = this.stepHasAction(step.blockId);
        if (reach) {
            return 'reach';
        }
        if (this.isStepCompleted(step)) {
            return 'passed';
        }
        return 'locked';
    }

    getTooltip(step: IStep): string {
        if (step.level > 1) {
            const parent = this.getParent(step)?.label;
            const line = this.isStepActive(step) ? 'Current stage of' : 'Stage of';
            return parent ? `${step.label}\n${line} ${parent}` : step.label;
        }
        switch (this.getState(step)) {
            case 'active':
                return `${step.label}\nYou are here`;
            case 'reach':
                return `${step.label}\nAvailable – click to open`;
            case 'passed':
                return `${step.label}\nEarlier step – already behind you in this workflow`;
            default:
                return `${step.label}\nNot available yet – opens as the workflow progresses`;
        }
    }

    onStepAction(step: IStep): void {
        if (this.getState(step) !== 'reach') {
            return;
        }
        this.policyProgressService.runStepAction(step.blockId);
        this.drawerOpen = false;
    }

    toggleHidden(): void {
        this.hiddenChange.emit(!this.hidden);
    }

    toggleDrawer(): void {
        this.drawerOpen = !this.drawerOpen;
    }
}
