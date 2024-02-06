import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-delete-policy-dialog',
    templateUrl: './delete-policy-dialog.component.html',
    styleUrls: ['./delete-policy-dialog.component.scss'],
})
export class DeletePolicyDialogComponent implements OnInit {
    loading = true;
    notificationText: string;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.notificationText = this.config.data.notificationText;
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
