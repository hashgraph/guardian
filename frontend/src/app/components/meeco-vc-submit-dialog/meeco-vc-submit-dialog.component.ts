import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WebSocketService } from 'src/app/services/web-socket.service';

interface VCSubmitDialogData {
  document: any;
  presentationRequestId: string;
  submissionId: string;
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

    constructor(
        @Inject(MAT_DIALOG_DATA) private data: VCSubmitDialogData,
        private wsService: WebSocketService
    ) {
        this.vcSubject = JSON.stringify(this.data.document, null, 4);
        this.presentationRequestId = this.data.presentationRequestId;
        this.submissionId = this.data.submissionId;
    }

    onReject(): void {
      this.wsService.rejectVCSubject(this.presentationRequestId, this.submissionId);
    }

    onApprove(): void {
      this.wsService.approveVCSubject(this.presentationRequestId, this.submissionId);
    }
}
