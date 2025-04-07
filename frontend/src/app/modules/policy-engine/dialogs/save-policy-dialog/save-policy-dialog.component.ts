import { Component, Inject } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';

import { Observable, ReplaySubject } from 'rxjs';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

export enum PolicyAction {
    CREATE_NEW_POLICY = 1,
    CREATE_NEW_VERSION = 2
}

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'save-policy-dialog',
    templateUrl: './save-policy-dialog.component.html',
    styleUrls: ['./save-policy-dialog.component.scss']
})
export class SavePolicyDialog {
    action?: PolicyAction;
    dataForm = this.fb.group({});
    isNewVersionDisabled: boolean = false;
    data: any;

    private _isActionSelected$ = new ReplaySubject<boolean>(1);

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
    ) {
        this.data = config.data;

        if (this.data.action) {
            this.setAction(this.data.action);
        } else {
            this._isActionSelected$.next(false);
        }

        this.isNewVersionDisabled = this.data.policy.owner !== this.data.policy.creator;
    }

    public get isActionSelected$(): Observable<boolean> {
        return this._isActionSelected$;
    }

    ngOnInit() {}

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            data.policyTag = data.policyTag.replace(/\s/g, '');
            this.dialogRef.close({
                policy: data,
                action: this.action
            });
        }
    }

    setAction(action: PolicyAction) {
        this.action = action;
        const tag = `Tag_${Date.now()}`;
        if (this.action === PolicyAction.CREATE_NEW_POLICY) {
            this.dataForm = this.fb.group({
                name: ['', Validators.required],
                description: [''],
                topicDescription: [''],
                policyTag: [tag, Validators.required],
            });
        } else if (this.action === PolicyAction.CREATE_NEW_VERSION) {
            this.dataForm = this.fb.group({
                name: [{ value: this.data.policy.name, disabled: true }, Validators.required],
                description: [this.data.policy.description],
                topicDescription: [this.data.policy.topicDescription],
                policyTag: [tag, Validators.required],
            });
        }
        this._isActionSelected$.next(true);
    }

    getTitle(): string {
        switch (this.action) {
            case PolicyAction.CREATE_NEW_POLICY:
                return 'New Policy';
            case PolicyAction.CREATE_NEW_VERSION:
                return 'New Version'
            default:
                return '';
        }
    }
}
