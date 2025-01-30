import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'new-formula-dialog',
    templateUrl: './new-formula-dialog.component.html',
    styleUrls: ['./new-formula-dialog.component.scss'],
})
export class NewFormulaDialog {
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
        this.policies = this.policies.filter((p) => p.topicId);

        const formula = this.config.data?.formula;
        const id = this.config.data?.policy?.id;
        this.policy = this.policies.find((p) => p.id === id) || null;
        if (formula) {
            this.readonly = true;
            this.dataForm.setValue({
                name: formula.name || 'N\\A',
                description: formula.description || 'N\\A',
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
                policyTopicId: policy?.topicId,
                policyInstanceTopicId: policy?.instanceTopicId,
            });
        }
    }
}
