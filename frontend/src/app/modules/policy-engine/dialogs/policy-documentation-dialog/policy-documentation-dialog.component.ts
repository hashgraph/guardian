import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastService } from 'src/app/services/toast.service';

@Component({
    selector: 'app-policy-documentation-dialog',
    templateUrl: './policy-documentation-dialog.component.html',
    styleUrls: ['./policy-documentation-dialog.component.scss'],
    standalone: false
})
export class PolicyDocumentationDialogComponent implements OnInit {
    public loading = true;
    public title: string;
    public entries: any[] = [];
    public isLargeSize = true;

    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private toastService: ToastService
    ) {
        this.title = this.config.header || 'API Documentation';
        this.entries = this.config.data?.entries || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.ref.close(false);
    }

    getGetParams(entry: any): any[] {
        return entry.getQueryParams || [];
    }

    getPostParams(entry: any): any[] {
        return entry.postQueryParams || [];
    }

    hasParams(entry: any): boolean {
        return this.getGetParams(entry).length > 0 || this.getPostParams(entry).length > 0;
    }

    copyUrl(url: string): void {
        navigator.clipboard.writeText(url).then(() => {
            this.toastService.success('URL copied to clipboard');
        }, () => {
            this.toastService.error('Failed to copy URL');
        });
    }

    toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh';
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
