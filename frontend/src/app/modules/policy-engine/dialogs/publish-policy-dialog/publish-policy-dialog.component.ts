import { Component, Inject } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ModelHelper } from "@guardian/interfaces"

/**
 * Publish policy
 */
@Component({
    selector: 'publish-policy-dialog.component',
    templateUrl: './publish-policy-dialog.component.html',
    styleUrls: ['./publish-policy-dialog.component.scss'],
})
export class PublishPolicyDialog {
    public loading = true;
    public policy: any;
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
    public recordingEnabled = true;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.policy = this.config.data?.policy;
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
                policyVersion: this.versionControl.value,
                policyAvailability: this.currentType,
                recordingEnabled: this.recordingEnabled
            });
        }
    }

    public get isPublishDisabled(): boolean {
        const isFormInvalid = !this.versionControl.valid;
        const isVersionNotNewer = this.policy?.previousVersion && ModelHelper.versionCompare(this.policy.previousVersion, this.versionControl.value) >= 0;
        return isFormInvalid || isVersionNotNewer;
    }
}
