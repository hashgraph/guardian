import {Component, Inject} from '@angular/core';
import {UntypedFormBuilder, Validators} from '@angular/forms';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

/**
 * Dialog for creating theme.
 */
@Component({
    selector: 'new-theme-dialog',
    templateUrl: './new-theme-dialog.component.html',
    styleUrls: ['./new-theme-dialog.component.scss']
})
export class NewThemeDialog {
    started = false;
    dataForm = this.fb.group({
        name: ['', Validators.required]
    });
    title: string;
    button: string;
    theme: any;

    constructor(
        private fb: UntypedFormBuilder,
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        const data = this.config.data

        if (data && data.theme) {
            this.theme = data.theme;
            this.dataForm.setValue({
                name: this.theme.name || ''
            });
            if (data.type === 'copy') {
                this.title = 'Copy Theme';
                this.button = 'Copy';
            } else {
                this.title = 'Edit Theme';
                this.button = 'Save';
            }
        } else {
            this.theme = null;
            this.title = 'New Theme';
            this.button = 'Create';
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
