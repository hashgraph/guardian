import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Dialog for creating module.
 */
@Component({
    selector: 'new-module-dialog',
    templateUrl: './new-module-dialog.component.html',
    styleUrls: ['./new-module-dialog.component.css']
})
export class NewModuleDialog {
    started = false;
    dataForm = this.fb.group({
        name: ['', Validators.required],
        description: ['']
    });

    constructor(
        public dialogRef: MatDialogRef<NewModuleDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.dialogRef.close(data);
        }
    }
}
