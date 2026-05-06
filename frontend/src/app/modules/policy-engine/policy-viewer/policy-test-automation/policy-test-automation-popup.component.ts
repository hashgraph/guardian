import { Component } from '@angular/core';
import { PolicyTestAutomationDraftService } from './policy-test-automation-draft.service';

@Component({
    selector: 'policy-test-automation-popup',
    templateUrl: './policy-test-automation-popup.component.html',
    styleUrls: ['./policy-test-automation-popup.component.scss']
})
export class PolicyTestAutomationPopupComponent {
    constructor(public draftService: PolicyTestAutomationDraftService) {}

    public onCaptureChange(checked: boolean): void {
        this.draftService.setCaptureNextFormSubmit(checked);
    }

    public discardInput(): void {
        this.draftService.discardInput();
    }

    public onAwaitingOutputsClick(): void {
        this.draftService.confirmOutputFromInput();
    }
}
