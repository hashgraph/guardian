import { Component } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { ViewerDialog } from '../../dialogs/viewer-dialog/viewer-dialog.component';
import { VCFullscreenDialog } from 'src/app/modules/schema-engine/vc-fullscreen-dialog/vc-fullscreen-dialog.component';
import { PolicyTestAutomationService, PolicyTestCaseOutput } from './policy-test-automation.service';

@Component({
    selector: 'policy-test-automation-popup',
    templateUrl: './policy-test-automation-popup.component.html',
    styleUrls: ['./policy-test-automation-popup.component.scss'],
    standalone: false
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
        this.openJson(tc.input.tag || 'Input', this.getInputDocument(tc.input.document));
    }

    public viewOutput(caseId: string, documentId: string): void {
        const tc = this.automationService.state.testCases.find((c) => c.id === caseId);
        const out = tc?.outputs.find((o) => o.documentId === documentId);
        if (!out?.document) { return; }
        this.openOutputDocument(out.tag || 'Document', out, tc?.input.policyId);
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

    private openOutputDocument(title: string, output: PolicyTestCaseOutput, policyId?: string): void {
        const type = this.getOutputDocumentType(output);
        if (!type) {
            this.openJson(title, output.document);
            return;
        }

        this.dialogService.open(VCFullscreenDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            maskStyleClass: 'guardian-fullscreen-dialog',
            data: {
                type,
                backLabel: 'Back',
                title,
                dryRun: true,
                id: output.documentId,
                row: {
                    id: output.documentId,
                    policyId,
                    schema: output.schemaId,
                    dryRunId: true
                },
                document: output.document,
                exportDocument: false,
                key: false,
                comments: false,
                commentsReadonly: true
            }
        });
    }

    private getOutputDocumentType(output: PolicyTestCaseOutput): 'VC' | 'VP' | null {
        if (output.type === 'vp') {
            return 'VP';
        }
        if (output.type === 'vc') {
            return 'VC';
        }

        const documentType = output.document?.type;
        const documentTypes = Array.isArray(documentType) ? documentType : [documentType];
        if (documentTypes.includes('VerifiablePresentation') || output.document?.verifiableCredential) {
            return 'VP';
        }
        if (documentTypes.includes('VerifiableCredential') || output.document?.credentialSubject) {
            return 'VC';
        }
        return null;
    }

    private getInputDocument(document: any): any {
        const subject = Array.isArray(document?.credentialSubject)
            ? document.credentialSubject[0]
            : document?.credentialSubject;

        if (!subject || typeof subject !== 'object') {
            return document;
        }

        const result: any = {};
        for (const key of Object.keys(subject)) {
            if (
                key === 'id' ||
                key === 'type' ||
                key === '@context' ||
                key === 'policyId' ||
                key === 'guardianVersion'
            ) {
                continue;
            }
            result[key] = subject[key];
        }
        return result;
    }
}
