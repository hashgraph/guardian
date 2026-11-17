import { Component, Inject } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ModelHelper } from '@guardian/interfaces';

/**
 * Publish tool dialog
 */
@Component({
    selector: 'publish-tool-dialog.component',
    templateUrl: './publish-tool-dialog.component.html',
    styleUrls: ['./publish-tool-dialog.component.scss'],
    standalone: false
})
export class PublishToolDialog {
    public loading = true;
    public tool: any;
    public versionControl: UntypedFormControl = new UntypedFormControl('', [
        Validators.required,
        Validators.pattern(/^[\d]+([\\.][\d]+){0,2}$/),
    ]);
    public types = [{
        label: 'Private',
        value: 'private'
    }, {
        label: 'Public',
        value: 'public'
    }];
    public currentType = 'private';

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.tool = this.config.data?.tool;
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
                toolVersion: this.versionControl.value
            });
        }
    }

    public get isPublishDisabled(): boolean {
        const isFormInvalid = !this.versionControl.valid;
        return isFormInvalid || this.isVersionNotNewer;
    }

    public get versionError(): string | null {
        if (this.versionControl.pristine && this.versionControl.untouched) {
            return null;
        }
        if (this.versionControl.hasError('required')) {
            return 'Version is required';
        }
        if (this.versionControl.hasError('pattern')) {
            return 'Version must contain only numbers separated by dots, for example 1, 1.0 or 1.0.0';
        }
        if (this.isVersionNotNewer) {
            return `Version must be greater than ${this.tool.previousVersion}`;
        }
        return null;
    }

    private get isVersionNotNewer(): boolean {
        return !!this.tool?.previousVersion && ModelHelper.versionCompare(this.tool.previousVersion, this.versionControl.value) >= 0;
    }
}
