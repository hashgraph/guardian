import { Component, Inject, OnDestroy } from '@angular/core';
import { ToastService } from 'src/app/services/toast.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService } from 'src/app/services/web-socket.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-qr-code-dialog',
    templateUrl: './qr-code-dialog.component.html',
    styleUrls: ['./qr-code-dialog.component.scss'],
    standalone: false
})
export class QrCodeDialogComponent implements OnDestroy {
    private readonly destroy$ = new Subject<void>();
    qrCodeData: string;
    errorMessage: string;
    isMobile: boolean = window.innerWidth <= 810;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private toastService: ToastService,
        private wsService: WebSocketService
    ) {
        const data = this.config.data

        this.qrCodeData = data.qrCodeData;
        this.handleNoQRCodeData();
        this.handleMeecoVerificationFail();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    handleMeecoVerificationFail(): void {
        this.wsService.meecoVerifyVPFailed$
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
                this.toastService.error(
                    `${event.error}.`,
                    'Submission for VP presentation request failed.'
                );

                this.closeDialog();
            });
    }

    handleNoQRCodeData(): void {
        if (!this.qrCodeData) {
            this.closeDialog();
            this.toastService.error(
                'Please, try again later.',
                'QR code cannot be generated.'
            );
        }
    }

    closeDialog(): void {
        this.dialogRef.close(null);
    }

    get qrCodeSize(): number {
        return this.isMobile ? 300 : 550;
    }
}
