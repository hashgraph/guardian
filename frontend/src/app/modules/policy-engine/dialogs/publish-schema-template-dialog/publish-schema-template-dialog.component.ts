import { Component } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { ModelHelper } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Publish schema template dialog
 */
@Component({
    selector: 'publish-schema-template-dialog',
    templateUrl: './publish-schema-template-dialog.component.html',
    styleUrls: ['./publish-schema-template-dialog.component.scss'],
    standalone: false
})
export class PublishSchemaTemplateDialog {
    public loading = true;
    public template: any;
    public versionControl: UntypedFormControl = new UntypedFormControl('', [
        Validators.required,
        Validators.pattern(/^[\d]+([\\.][\d]+){0,2}$/),
    ]);

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.template = this.config.data?.template;
    }

    ngOnInit() {
        this.loading = false;
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        if (!this.isPublishDisabled) {
            this.ref.close({
                templateVersion: this.versionControl.value
            });
        }
    }

    public get isPublishDisabled(): boolean {
        const isFormInvalid = !this.versionControl.valid;
        const currentVersion = this.template?.previousVersion || this.template?.version;
        const isVersionNotNewer = currentVersion && ModelHelper.versionCompare(currentVersion, this.versionControl.value) >= 0;
        return isFormInvalid || isVersionNotNewer;
    }
}
