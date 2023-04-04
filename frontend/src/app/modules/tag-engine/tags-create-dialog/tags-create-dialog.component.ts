import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * Dialog for creating tags.
 */
@Component({
    selector: 'tags-create-dialog',
    templateUrl: './tags-create-dialog.component.html',
    styleUrls: ['./tags-create-dialog.component.css']
})
export class TagCreateDialog {
    started = false;
    dataForm = this.fb.group({
        name: ['', Validators.required],
        description: [''],
    });
    title: string = "New Tag";
    schemas: any[] = [];
    schema: any;
    schemaForm: FormGroup;

    constructor(
        public dialogRef: MatDialogRef<TagCreateDialog>,
        private changeDetector: ChangeDetectorRef,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.schemas = data?.schemas;
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
                const vc = this.schemaForm.value;
                data.document = vc;
            }
            this.dialogRef.close(data);
        }
    }

    onAddArtifact(selector: any) {
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
