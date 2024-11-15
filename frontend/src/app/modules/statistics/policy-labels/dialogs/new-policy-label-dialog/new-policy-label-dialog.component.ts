import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'new-policy-label-dialog',
    templateUrl: './new-policy-label-dialog.component.html',
    styleUrls: ['./new-policy-label-dialog.component.scss'],
})
export class NewPolicyLabelDialog {
    public loading = true;
    public policy: any;
    public policies: any[];
    public dataForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<any>(null, Validators.required)
    });
    public title: string;
    public action: string;
    public readonly: boolean;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title || '';
        this.action = this.config.data?.action || '';
        this.policies = this.config.data?.policies || [];
        this.policies = this.policies.filter((p) => p.instanceTopicId);
        const label = this.config.data?.label;
        const instanceTopicId = this.config.data?.policy?.instanceTopicId;
        this.policy = this.policies.find((p) => p.instanceTopicId === instanceTopicId) || null;
        if (label) {
            this.readonly = true;
            this.dataForm.setValue({
                name: label.name || 'N\\A',
                description: label.description || 'N\\A',
                policy: this.policy
            })
        } else {
            this.readonly = false;
            this.dataForm.setValue({
                name: '',
                description: '',
                policy: this.policy
            })
        }
    }

    public get currentPolicy(): any {
        return this.dataForm.value.policy;
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        if (this.dataForm.valid) {
            const { name, description, policy } = this.dataForm.value;
            this.ref.close({
                name,
                description,
                policyId: policy?.id,
                instanceTopicId: policy?.instanceTopicId,
            });
        }
    }
}
