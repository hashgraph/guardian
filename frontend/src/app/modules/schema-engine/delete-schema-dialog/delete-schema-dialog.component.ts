import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-delete-schema-dialog',
    templateUrl: './delete-schema-dialog.component.html',
    styleUrls: ['./delete-schema-dialog.component.scss'],
})
export class DeleteSchemaDialogComponent implements OnInit {
    loading = true;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
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
