import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for creating file.
 */
@Component({
    selector: 'import-file-dialog',
    templateUrl: './import-file-dialog.component.html',
    styleUrls: ['./import-file-dialog.component.css']
})
export class ImportFileDialog {
    loading: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<ImportFileDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    importFromFile(file: any) {
        const reader = new FileReader()
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;
            this.dialogRef.close(arrayBuffer);
        });
    }
}
