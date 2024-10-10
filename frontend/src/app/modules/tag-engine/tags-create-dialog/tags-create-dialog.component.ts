import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Dialog for creating tags.
 */
@Component({
    selector: 'tags-create-dialog',
    templateUrl: './tags-create-dialog.component.html',
    styleUrls: ['./tags-create-dialog.component.scss']
})
export class TagCreateDialog {
    started = false;
    dataForm = this.fb.group({
        name: ['', Validators.required],
        description: [''],
    });
    title: string = 'New Tag';
    schemas: any[] = [];
    schema: any;
    schemaForm: FormGroup;
    canAddDocument = false;

    constructor(
        public dialogRef: DynamicDialogRef,
        private changeDetector: ChangeDetectorRef,
        private fb: FormBuilder,
        public data: DynamicDialogConfig) {
        this.schemas = data.data?.schemas;
        this.schemaForm = fb.group({});
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onCreate() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            if (this.schema) {
                data.document = this.schemaForm.value;
                data.schema = this.schema?.iri;
            }
            this.dialogRef.close(data);
        }
    }

    onAddArtifact(selector: any) {
        this.canAddDocument = true;

        if (this.schemas.length === 1) {
            this.schemaForm = this.fb.group({});
            this.schema = this.schemas[0];
            this.changeDetector.detectChanges();
        } else {
            selector?.open();
        }
    }

    onSelectSchema() {
        this.changeDetector.detectChanges();
    }

    onDeleteArtifact() {
        this.schema = null;
        this.canAddDocument = false;
    }

    public get disabled(): boolean {
        if (this.started) {
            if (this.schema) {
                return !(this.dataForm.valid && this.schemaForm.valid);
            } else {
                return !(this.dataForm.valid);
            }
        }
        return true;
    }
}
