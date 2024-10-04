import { Component, Inject } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

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
            this.ref.close(this.versionControl.value);
        }
    }

    public get isPublishDisabled(): boolean {
        return !this.versionControl.valid;
    }
}
