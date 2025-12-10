import { Component, Inject } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Publish tool dialog
 */
@Component({
    selector: 'publish-tool-dialog.component',
    templateUrl: './publish-tool-dialog.component.html',
    styleUrls: ['./publish-tool-dialog.component.scss'],
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
        return !this.versionControl.valid;
    }
}
