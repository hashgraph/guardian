import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

export interface GeoFileLimitDialogData {
    mode: 'warn' | 'reject';
    message: string;
}

@Component({
    selector: 'app-geo-file-limit-dialog',
    templateUrl: './geo-file-limit-dialog.component.html',
    standalone: false
})
export class GeoFileLimitDialogComponent {
    public readonly mode: 'warn' | 'reject';
    public readonly message: string;

    constructor(config: DynamicDialogConfig<GeoFileLimitDialogData>, private readonly ref: DynamicDialogRef) {
        this.mode = config.data!.mode;
        this.message = config.data!.message;
    }

    public close(accepted: boolean): void {
        this.ref.close(accepted);
    }
}
