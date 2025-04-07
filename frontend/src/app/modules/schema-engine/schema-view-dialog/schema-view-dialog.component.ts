import {Component, Inject} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

/**
 * Dialog for preview schema.
 */
@Component({
    selector: 'app-schema-view-dialog',
    templateUrl: './schema-view-dialog.component.html',
    styleUrls: ['./schema-view-dialog.component.scss']
})
export class SchemaViewDialog {
    loading = true;
    schemas!: any[];
    topicId: any;
    policies: any[];
    modules: any[];
    tools: any[];
    errors: any[];
    schemaType: string;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        const data = this.config.data

        this.schemas = data.schemas || [];
        this.topicId = data.topicId || null;
        this.errors = data.errors || [];

        this.schemaType = data.schemaType || 'policy';
        this.policies = data.policies || [];
        this.modules = data.modules || [];
        this.tools = data.tools || [];

        if(this.errors) {
            for (const error of this.errors) {
                if (error.cell) {
                    error.__path = `Cell: ${error.cell}`;
                } else if (error.row) {
                    error.__path = `Row: ${error.row}`;
                } else if (error.col) {
                    error.__path = `Col: ${error.col}`;
                }
            }
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    onImport() {
        this.dialogRef.close({topicId: this.topicId});
    }

    onNewVersionClick(messageId: string) {
        this.dialogRef.close({messageId});
    }
}
