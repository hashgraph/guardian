import { Component, ElementRef, ViewChild } from '@angular/core';
import { DocumentGenerator, Schema } from '@guardian/interfaces';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { SchemaService } from '../../../services/schema.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';


/**
 * Dialog for creating and editing schemas.
 */
@Component({
    selector: 'schema-form-dialog',
    templateUrl: './schema-form-dialog.component.html',
    styleUrls: ['./schema-form-dialog.component.scss']
})
export class SchemaFormDialog {
    public header: string;
    public schema: Schema;
    public started: boolean = false;
    public dataForm: UntypedFormGroup;
    public presetDocument: any;
    public hideFields: any;
    public example: boolean = false;
    public category: string;
    public readonlyFields: any;
    public isLargeSize: boolean = true;
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
        private schemaService: SchemaService,
    ) {
        const data = this.config.data
        this.header = this.config.header || '';
        this.schema = data.schema || null;
        this.example = data.example || false;
        this.dataForm = this.fb.group({});
        this.hideFields = {};
        this.category = data.category;
    }

    ngOnInit(): void {
        this.getSubSchemes()
    }

    public onClose() {
        this.dialogRef.close(null);
    }

    public initForm($event: any) {
        this.dataForm = $event;
    }

    getSubSchemes() {
        const { topicId, id } = this.schema ?? {};

        this.schemaService.getSchemaWithSubSchemas(this.category, id, topicId).subscribe((data) => {
            if (this.schema && data.schema) {
                this.schema = new Schema(data.schema);
            }

            if (this.example) {
                this.presetDocument = DocumentGenerator.generateDocument(this.schema);
                this.readonlyFields = this.schema.fields;
            } else {
                this.presetDocument = null
            }

            this.started = true
        });
    }

    public toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
