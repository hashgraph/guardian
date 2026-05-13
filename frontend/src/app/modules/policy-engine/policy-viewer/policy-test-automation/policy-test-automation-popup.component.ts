import { Component } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ViewerDialog } from '../../dialogs/viewer-dialog/viewer-dialog.component';
import { PolicyTestAutomationDraftService, PolicyTestOutputAnchor } from './policy-test-automation-draft.service';

@Component({
    selector: 'policy-test-automation-popup',
    templateUrl: './policy-test-automation-popup.component.html',
    styleUrls: ['./policy-test-automation-popup.component.scss']
})
export class PolicyTestAutomationPopupComponent {
    constructor(
        public draftService: PolicyTestAutomationDraftService,
        private dialogService: DialogService
    ) {}

    public onCaptureChange(checked: boolean): void {
        this.draftService.setCaptureNextFormSubmit(checked);
    }

    public discardInput(): void {
        this.draftService.discardInput();
    }

    public confirmDocumentResults(): void {
        this.draftService.confirmOutputFromInput();
    }

    public inspectInput(): void {
        const input = this.draftService.draft.input;
        if (!input) {
            return;
        }
        this.openJson(input.title || 'Input', input.document);
    }

    public inspectOutput(output: PolicyTestOutputAnchor): void {
        this.openJson(output.title || 'Output', output.document || output);
    }

    public discardOutput(type: string, id: string): void {
        this.draftService.discardOutput(type, id);
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
