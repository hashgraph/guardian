import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-delete-dialog',
    templateUrl: './delete-dialog.component.html',
    styleUrls: ['./delete-dialog.component.scss'],
})
export class DeleteDialogComponent implements OnInit {
    public loading = true;
    public title: string;
    public notificationText: string;
    public itemNames: string[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.title = this.config.header || 'Delete';
        this.notificationText = this.config.data.notificationText;
        this.itemNames = this.config.data.itemNames;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.ref.close(false);
    }

    handleDeleteSchema() {
        this.ref.close(true);
    }
}
