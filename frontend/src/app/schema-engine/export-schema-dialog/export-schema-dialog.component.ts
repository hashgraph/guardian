import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SchemaService } from 'src/app/services/schema.service';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'export-schema-dialog',
    templateUrl: './export-schema-dialog.component.html',
    styleUrls: ['./export-schema-dialog.component.css']
})
export class ExportSchemaDialog {
    loading = true;

    schema!: any

    constructor(
        public dialogRef: MatDialogRef<ExportSchemaDialog>,
        private schemaService: SchemaService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schema = data.schema;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    saveToFile() {
        this.loading = true;
        this.schemaService.exportInFile(this.schema.id)
            .subscribe((result) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(result);
                downloadLink.setAttribute('download', `schemes_${Date.now()}.zip`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, error => {
                this.loading = false;
            });
    }
}
