import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'new-policy-statistics-dialog',
    templateUrl: './new-policy-statistics-dialog.component.html',
    styleUrls: ['./new-policy-statistics-dialog.component.scss'],
})
export class NewPolicyStatisticsDialog {
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

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title || '';
        this.action = this.config.data?.action || '';
        this.policies = this.config.data?.policies || [];
        this.policies = this.policies.filter((p) => p.instanceTopicId);
        const statistic = this.config.data?.statistic;
        const instanceTopicId = this.config.data?.policy?.instanceTopicId;
        this.policy = this.policies.find((p) => p.instanceTopicId === instanceTopicId) || null;
        if (statistic) {
            this.dataForm.setValue({
                name: statistic.name || '',
                description: statistic.description || '',
                policy: this.policy
            })
        } else {
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
