import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SchemaService } from 'src/app/services/schema.service';

@Component({
    selector: 'export-plantuml-dialog',
    templateUrl: './export-plantuml-dialog.component.html',
    styleUrls: ['./export-plantuml-dialog.component.scss'],
})
export class ExportPlantUMLDialog {
    public loading = false;
    public includeFields: boolean = true;
    public includeFormulas: boolean = false;
    public includeDependencies: boolean = false;

    private schema: any;

    constructor(
        private ref: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private schemaService: SchemaService
    ) {
        this.schema = this.config.data.schema;
    }

    public download(): void {
        this.loading = true;
        this.schemaService.getSchemaTreePlantUML(
            this.schema.id,
            this.includeFields,
            this.includeFormulas,
            this.includeFormulas && this.includeDependencies
        ).subscribe({
            next: (plantUML: string) => {
                const blob = new Blob([plantUML], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `schema-tree-${this.schema.name || this.schema.id}.puml`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.loading = false;
                this.ref.close();
            },
            error: (error: any) => {
                console.error('PlantUML export failed:', error);
                this.loading = false;
            }
        });
    }

}
