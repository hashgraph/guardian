import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WebSocketService } from 'src/app/services/web-socket.service';

@Component({
    selector: 'app-qr-code-dialog',
    templateUrl: './qr-code-dialog.component.html',
    styleUrls: ['./qr-code-dialog.component.scss'],
})
export class QrCodeDialogComponent {
    qrCodeData: string;
    isMobile: boolean = window.innerWidth <= 810;

    constructor(
        @Inject(MAT_DIALOG_DATA) private data: any,
        private dialogRef: MatDialogRef<QrCodeDialogComponent>,
        private wsService: WebSocketService,
    ) {
        this.qrCodeData = this.data.qrCodeData;
        this.handleMeecoVerificationFail();
    }

    handleMeecoVerificationFail(): void {
        this.wsService.meecoVerifyVPFailedSubscribe(() => this.closeDialog());
    }

    closeDialog(): void {
        this.dialogRef.close(null);
    }

    get qrCodeSize(): number {
        return this.isMobile ? 300 : 550;
    }
}
