import { Component } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ViewerDialog } from '../../dialogs/viewer-dialog/viewer-dialog.component';
import { PolicyTestAutomationService } from './policy-test-automation.service';

@Component({
    selector: 'policy-test-automation-popup',
    templateUrl: './policy-test-automation-popup.component.html',
    styleUrls: ['./policy-test-automation-popup.component.scss']
})
export class PolicyTestAutomationPopupComponent {
    constructor(
        public automationService: PolicyTestAutomationService,
        private dialogService: DialogService
    ) {}

    public onCaptureChange(checked: boolean): void {
        this.automationService.setCaptureNextFormSubmit(checked);
    }

    public discardTestCase(id: string): void {
        this.automationService.discardTestCase(id);
    }

    public toggleInputSelected(caseId: string): void {
        this.automationService.toggleInputSelected(caseId);
    }

    public toggleOutputSelected(caseId: string, documentId: string): void {
        this.automationService.toggleOutputSelected(caseId, documentId);
    }

    public viewInput(caseId: string): void {
        const tc = this.automationService.state.testCases.find((c) => c.id === caseId);
        if (!tc?.input?.document) { return; }
        this.openJson(tc.input.tag || 'Input', tc.input.document);
    }

    public viewOutput(caseId: string, documentId: string): void {
        const tc = this.automationService.state.testCases.find((c) => c.id === caseId);
        const out = tc?.outputs.find((o) => o.documentId === documentId);
        if (!out?.document) { return; }
        this.openJson(out.tag || 'Document', out.document);
    }

    private openJson(title: string, value: unknown): void {
        this.dialogService.open(ViewerDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                title,
                type: 'JSON',
                value,
                dryRun: true
            }
        });
    }
}
