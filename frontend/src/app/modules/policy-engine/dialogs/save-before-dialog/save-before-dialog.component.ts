import { Component, OnInit } from '@angular/core';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
// import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
    selector: 'app-save-before-dialog',
    templateUrl: './save-before-dialog.component.html',
    styleUrls: ['./save-before-dialog.component.scss']
})
export class SaveBeforeDialogComponent implements OnInit {

    constructor(
        // public dialogRef: MatDialogRef<SaveBeforeDialogComponent>
        private dialogRef: DynamicDialogRef,
    ) {
    }

    ngOnInit(): void {
    }

    cancel() {
        this.dialogRef.close(null);
    }

    save() {
        this.dialogRef.close(true);
    }
}
