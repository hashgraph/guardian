import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Dialog for creating theme.
 */
@Component({
    selector: 'new-theme-dialog',
    templateUrl: './new-theme-dialog.component.html',
    styleUrls: ['./new-theme-dialog.component.css']
})
export class NewThemeDialog {
    started = false;
    dataForm = this.fb.group({
        name: ['', Validators.required]
    });
    title: string;
    theme: any;

    constructor(
        public dialogRef: MatDialogRef<NewThemeDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {

        if (data && data.theme) {
            this.theme = data.theme;
            this.dataForm.setValue({
                name: this.theme.name || ''
            });
            if(data.type === 'copy') {
                this.title = 'Copy Theme';
            } else {
                this.title = 'Edit Theme';
            }
        } else {
            this.theme = null;
            this.title = 'New Theme';
            this.dataForm.setValue({
                name: 'New Theme'
            });
        }
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
