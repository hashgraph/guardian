import { Component, Inject } from '@angular/core';
import { SchemaService } from 'src/app/services/schema.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'export-schema-dialog',
    templateUrl: './export-schema-dialog.component.html',
    styleUrls: ['./export-schema-dialog.component.scss'],
})
export class ExportSchemaDialog {
    loading = true;

    schema!: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private schemaService: SchemaService
    ) {
        this.schema = this.config.data.schema;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.ref.close(false);
    }

    handleCopyToClipboard(text: string): void {
        navigator.clipboard.writeText(text);
    }

    public saveToFile() {
        this.loading = true;
        this.schemaService.exportInFile(this.schema.id).subscribe(
            (fileBuffer) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-schema',
                    })
                );
                downloadLink.setAttribute(
                    'download',
                    `${this.schema.name}.schema`
                );
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                    this.ref.close();
                }, 500);
            },
            (error) => {
                this.loading = false;
            }
        );
    }

    public saveToExcel() {
        this.loading = true;
        this.schemaService.exportToExcel(this.schema.id).subscribe(
            (fileBuffer) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-schema',
                    })
                );
                downloadLink.setAttribute(
                    'download',
                    `schemas_${Date.now()}.xlsx`
                );
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                    this.ref.close();
                }, 500);
            },
            (error) => {
                this.loading = false;
            }
        );
    }
}
