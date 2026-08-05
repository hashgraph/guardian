import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DryRunSettings } from '../../structures/storage/dry-run-settings';

export interface DryRunDialogResult {
    enableMock: boolean;
    dontAskAgain: boolean;
}

@Component({
    selector: 'dry-run-dialog',
    templateUrl: './dry-run-dialog.component.html',
    styleUrls: ['./dry-run-dialog.component.scss'],
    standalone: false
})
export class DryRunDialog {
    public enableMock = false;
    public dontAskAgain = false;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
    }

    public onCancel(): void {
        this.ref.close(null);
    }

    public onStart(): void {
        this.ref.close({
            enableMock: this.enableMock,
            dontAskAgain: this.dontAskAgain
        });
    }
}

/**
 * Ask whether to move a policy to Dry-Run with Mock Data enabled.
 * Emits the chosen setting when the user proceeds, or null when they cancel.
 * When the policy has muted the prompt, resolves immediately without mock.
 */
export function confirmDryRun(
    dialogService: DialogService,
    policyId: string
): Observable<{ enableMock: boolean } | null> {
    if (DryRunSettings.skipMockPrompt(policyId)) {
        return of({ enableMock: false });
    }
    const dialogRef = dialogService.open(DryRunDialog, {
        showHeader: false,
        width: '640px',
        styleClass: 'guardian-dialog',
    });
    if (!dialogRef) {
        return of(null);
    }
    return dialogRef.onClose.pipe(
        map((result: DryRunDialogResult | null) => {
            if (!result) {
                return null;
            }
            if (result.dontAskAgain) {
                DryRunSettings.muteMockPrompt(policyId);
            }
            return { enableMock: result.enableMock };
        })
    );
}
