import {Component, OnInit} from '@angular/core';
import {DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-save-before-dialog',
    templateUrl: './save-before-dialog.component.html',
    styleUrls: ['./save-before-dialog.component.scss']
})
export class SaveBeforeDialogComponent implements OnInit {

    constructor(
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
