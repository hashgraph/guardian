import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Dialog for creating theme.
 */
@Component({
    selector: 'record-result-dialog',
    templateUrl: './record-result-dialog.component.html',
    styleUrls: ['./record-result-dialog.component.css']
})
export class RecordResultDialog {
    public started = false;
    public title: string;
    public text: string;

    constructor(
        public dialogRef: MatDialogRef<RecordResultDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {

        this.title = 'Result';
        this.text = 'Playback completed';
        if (data) {

        } else {

        }
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }
}
