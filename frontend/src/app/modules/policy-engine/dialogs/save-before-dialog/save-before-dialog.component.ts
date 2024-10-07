import { Component, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

@Component({
    selector: 'app-save-before-dialog',
    templateUrl: './save-before-dialog.component.html',
    styleUrls: ['./save-before-dialog.component.scss']
})
export class SaveBeforeDialogComponent implements OnInit {

    constructor(public dialogRef: MatDialogRef<SaveBeforeDialogComponent>) {
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
