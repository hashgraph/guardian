import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-delete-dialog',
    templateUrl: './delete-dialog.component.html',
    styleUrls: ['./delete-dialog.component.scss'],
})
export class DeleteDialogComponent implements OnInit {
    public loading = true;
    public header: string;
    public text: string;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data.header;
        this.text = this.config.data.text;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.ref.close(false);
    }

    oneDelete() {
        this.ref.close(true);
    }
}
