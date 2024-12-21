import { Component, Inject, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService } from 'src/app/services/web-socket.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-qr-code-dialog',
    templateUrl: './qr-code-dialog.component.html',
    styleUrls: ['./qr-code-dialog.component.scss'],
})
export class QrCodeDialogComponent implements OnDestroy {
    private readonly destroy$ = new Subject<void>();
    qrCodeData: string;
    errorMessage: string;
    isMobile: boolean = window.innerWidth <= 810;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private toastr: ToastrService,
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

                this.closeDialog();
            });
    }

    handleNoQRCodeData(): void {
        if (!this.qrCodeData) {
            this.closeDialog();
            this.toastr.error(
                'Please, try again later.',
                'QR code cannot be generated.',
                {
                    timeOut: 10000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                }
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
