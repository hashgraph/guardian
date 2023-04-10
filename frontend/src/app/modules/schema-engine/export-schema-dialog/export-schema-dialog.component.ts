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
            .subscribe((fileBuffer) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(new Blob([new Uint8Array(fileBuffer)], {
                    type: 'application/guardian-schema'
                }));
                downloadLink.setAttribute('download', `schemas_${Date.now()}.schema`);
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
