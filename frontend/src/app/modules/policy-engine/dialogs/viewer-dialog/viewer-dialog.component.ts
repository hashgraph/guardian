import {Component, ElementRef, Inject, Input, ViewChild} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'viewer-dialog',
    templateUrl: './viewer-dialog.component.html',
    styleUrls: ['./viewer-dialog.component.scss']
})
export class ViewerDialog {
    public title: string = '';
    public type: any = 'TEXT';
    public text: any = '';
    public json: any = '';
    public links: any = [];
    public dryRun: boolean = false;

    public data: any

    public isLargeSize: boolean = true;
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.data = this.config.data;
    }

    ngOnInit() {
        const {
            value,
            title,
            type,
            dryRun
        } = this.data;

        this.dryRun = dryRun;
        this.title = title;
        this.type = type || 'TEXT';
        if (this.type === 'JSON') {
            this.json = value ? JSON.stringify((value), null, 4) : '';
        }
        if (this.type === 'TEXT') {
            this.text = value || '';
        }
        if (this.type === 'LINK') {
            if (Array.isArray(value)) {
                this.links = [];
                for (const link of value) {
                    this.links.push(link);
                }
            } else if (value) {
                this.links = [value];
            }
        }
    }

    onClick(): void {
        this.dialogRef.close(null);
    }

    public toggleSize(): void {
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
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
