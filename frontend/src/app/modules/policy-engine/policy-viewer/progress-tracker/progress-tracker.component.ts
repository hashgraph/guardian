import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnInit,
    Renderer2,
} from '@angular/core';
import { IStep } from '../../structures';
import { PolicyProgressService } from '../../services/policy-progress.service';

/**
 * Component for display all blocks.
 */
@Component({
    selector: 'progress-tracker',
    templateUrl: './progress-tracker.component.html',
    styleUrls: ['./progress-tracker.component.scss'],
})
export class ProgressTrackerComponent implements OnInit {
    @Input('steps') steps!: IStep[];
    activeSteps: IStep[] = [];

    constructor(
        private policyProgressService: PolicyProgressService,
        private changeDetector: ChangeDetectorRef,
        private elRef: ElementRef, private renderer: Renderer2
    ) {
    }

    ngOnInit(): void {
        this.policyProgressService.data$.subscribe((data: any) => {
            this.activeSteps = [];
            const blocks = document.querySelectorAll('[block-uuid]');
            this.steps.forEach(step => {
                blocks.forEach(block => {
                    const blockId = block.getAttribute('block-uuid');
                    if (blockId === step.blockId) {
                        this.activeSteps.push(step);
                        this.changeDetector.detectChanges();
                    }
                });
            });

            if (this.activeSteps.length > 0) {
                this.policyProgressService.updateCurrentStep(this.activeSteps[0].index, this.activeSteps[0].blockId);
            }
        })
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

    onStepAction(blockId: string): void {
        this.policyProgressService.runStepAction(blockId);
    }

    ngAfterViewInit() {
    }

    ngOnDestroy() {
    }

    loadComponent() {
    }
}
