import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-policy-documentation-dialog',
    templateUrl: './policy-documentation-dialog.component.html',
    styleUrls: ['./policy-documentation-dialog.component.scss'],
})
export class PolicyDocumentationDialogComponent implements OnInit {
    public loading = true;
    public title: string;
    public entries: any[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.title = this.config.header || 'Policy Documentation';
        this.entries = this.config.data?.entries || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.ref.close(false);
    }

    copyUrl(url: string): void {
        navigator.clipboard.writeText(url);
    }
}
