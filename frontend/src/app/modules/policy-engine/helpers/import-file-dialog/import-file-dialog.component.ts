import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for creating file.
 */
@Component({
    selector: 'import-file-dialog',
    templateUrl: './import-file-dialog.component.html',
    styleUrls: ['./import-file-dialog.component.scss']
})
export class ImportFileDialog {
    public loading: boolean = false;
    public fileExtension: string;
    public label: string;

    constructor(
        public dialogRef: MatDialogRef<ImportFileDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (data) {
            this.fileExtension = data.fileExtension || 'theme';
            this.label = data.label || 'Import Theme .theme file';
        } else {
            this.fileExtension = 'theme';
            this.label = 'Import Theme .theme file';
        }
    }

    public onNoClick(): void {
        this.dialogRef.close(null);
    }

    public importFromFile(file: any) {
        const reader = new FileReader()
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;
            this.dialogRef.close(arrayBuffer);
        });
    }
}
