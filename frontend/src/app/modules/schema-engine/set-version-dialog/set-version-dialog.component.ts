import {Component, Inject} from '@angular/core';
import {UntypedFormControl, Validators} from '@angular/forms';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

/**
 * Dialog allowing you to select a file and load schemas.
 */
@Component({
    selector: 'set-version-dialog',
    templateUrl: './set-version-dialog.component.html',
    styleUrls: ['./set-version-dialog.component.scss'],
})
export class SetVersionDialog {
    versionControl: UntypedFormControl = new UntypedFormControl('', [
        Validators.required,
        Validators.pattern(/^[\d]+([\\.][\d]+){0,2}$/),
    ]);

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        console.log(3);
    }

    onNoClick(): void {
        this.dialogRef.close(false);
    }

    onSubmit(): void {
        if (!this.isPublishDisabled) {
            this.dialogRef.close(this.versionControl.value);
        }
    }

    get isPublishDisabled(): boolean {
        return !this.versionControl.valid;
    }
}
