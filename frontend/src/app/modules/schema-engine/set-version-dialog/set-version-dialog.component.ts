import {Component, Inject} from '@angular/core';
import {UntypedFormControl, Validators} from '@angular/forms';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import { ModelHelper } from '@guardian/interfaces';

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
    schema: any;

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.schema = config.data?.schema;
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
        const isFormInvalid = !this.versionControl.valid;
        const isVersionNotNewer = this.schema?.version && ModelHelper.versionCompare(this.schema.version, this.versionControl.value) >= 0;
        return isFormInvalid || isVersionNotNewer;
    }
}
