import { Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { WebSocketService } from 'src/app/services/web-socket.service';

@Component({
    selector: 'app-qr-code-dialog',
    templateUrl: './qr-code-dialog.component.html',
    styleUrls: ['./qr-code-dialog.component.scss'],
})
export class QrCodeDialogComponent implements OnDestroy {
    qrCodeData: string;
    isMobile: boolean = window.innerWidth <= 810;

    constructor(
        @Inject(MAT_DIALOG_DATA) private data: any,
        private dialogRef: MatDialogRef<QrCodeDialogComponent>,
        private toastr: ToastrService,
        private wsService: WebSocketService
    ) {
        this.qrCodeData = this.data.qrCodeData;
        this.handleMeecoVerificationFail();
    }

    ngOnDestroy(): void {
        this.wsService.closeVerifyVPSubscription();
        this.wsService.closeVerifyVPFailedSubscription();
    }

    handleMeecoVerificationFail(): void {
        this.wsService.meecoVerifyVPFailedSubscribe((event) => {
            this.closeDialog();
            this.toastr.error(
                `${event.error}.`,
                'Submission for VP presentation request failed.',
                {
                    timeOut: 10000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                }
            );
        });
    }

    closeDialog(): void {
        this.dialogRef.close(null);
    }

    get qrCodeSize(): number {
        return this.isMobile ? 300 : 550;
    }
}
