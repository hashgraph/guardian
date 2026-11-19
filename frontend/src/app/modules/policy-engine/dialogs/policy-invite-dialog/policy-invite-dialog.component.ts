import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Invite link and QR code of a public policy.
 */
@Component({
    selector: 'policy-invite-dialog',
    templateUrl: './policy-invite-dialog.component.html',
    styleUrls: ['./policy-invite-dialog.component.scss'],
    standalone: false
})
export class PolicyInviteDialog {
    public policy: any;
    public invite: string;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.policy = this.config.data?.policy || {};
        this.invite = this.config.data?.invite || '';
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onCopy(): void {
        navigator.clipboard.writeText(this.invite || '');
    }
}
