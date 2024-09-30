import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserRole } from '@guardian/interfaces';
import { WebSocketService } from 'src/app/services/web-socket.service';

interface VCSubmitDialogData {
    document: any;
    presentationRequestId: string;
    submissionId: string;
    userRole: string;
}

interface RolesData {
    displayName: string;
    value: UserRole;
}

@Component({
    selector: 'app-meeco-vc-submit-dialog',
    templateUrl: './meeco-vc-submit-dialog.component.html',
    styleUrls: ['./meeco-vc-submit-dialog.component.scss'],
})
export class MeecoVCSubmitDialogComponent {
    vcSubject: any;
    presentationRequestId: string;
    submissionId: string;
    userRole: string;
    roles: RolesData[] = [
        {
            displayName: 'Standard Registry',
            value: UserRole.STANDARD_REGISTRY,
        },
        {
            displayName: 'User',
            value: UserRole.USER,
        },
        {
            displayName: 'Auditor',
            value: UserRole.AUDITOR,
        },
    ];
    selectedRole: UserRole;

    constructor(
        @Inject(MAT_DIALOG_DATA) private data: VCSubmitDialogData,
        private dialogRef: MatDialogRef<MeecoVCSubmitDialogComponent>,
        private wsService: WebSocketService
    ) {
        this.vcSubject = Object.entries(this.data.document);
        this.presentationRequestId = this.data.presentationRequestId;
        this.submissionId = this.data.submissionId;
        this.userRole = this.data.userRole;
    }

    private closeDialog(): void {
        this.dialogRef.close(null);
    }

    onReject(): void {
        this.wsService.rejectVCSubject(
            this.presentationRequestId,
            this.submissionId
        );
        this.closeDialog();
    }

    onApprove(): void {
        this.wsService.approveVCSubject(
            this.presentationRequestId,
            this.submissionId,
            this.selectedRole
        );
    }

    get isApproveBtnDisabled(): boolean {
        return !this.selectedRole && !this.userRole;
    }
}
