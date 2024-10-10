import { Component } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';

/**
 * Dialog allowing you to select a file and load schemas.
 */
@Component({
    selector: 'service-unavailable-dialog',
    templateUrl: './service-unavailable-dialog.component.html',
    styleUrls: ['./service-unavailable-dialog.component.css'],
})
export class ServiceUnavailableDialog {

    constructor(
        private dialogRef: DynamicDialogRef,
        private router: Router,
    ) {
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onSubmit(): void {
        this.router.navigate(['/status']);
        this.onNoClick();
    }
}
