import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

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
        name: ['Label', Validators.required],
        description: ['description'],
    });
    title: string = "New Tag";

    constructor(
        public dialogRef: MatDialogRef<TagCreateDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
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
            this.dialogRef.close(data);
        }
    }
}
