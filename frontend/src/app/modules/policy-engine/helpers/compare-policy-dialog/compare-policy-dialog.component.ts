import { ChangeDetectorRef, Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'compare-policy-dialog',
    templateUrl: './compare-policy-dialog.component.html',
    styleUrls: ['./compare-policy-dialog.component.scss'],
})
export class ComparePolicyDialog {
    loading = true;

    policy!: any;
    policies: any[];

    policyId1!: string;
    policyId2!: string[];

    list1: any[];
    list2: any[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private changeDetector: ChangeDetectorRef,
    ) {
        this.policy = this.config.data.policy;
        this.policies = this.config.data.policies || [];
        this.policyId1 = this.policy?.id;
        this.list1 = this.policies;
        this.list2 = this.policies;
    }

    public get disabled(): boolean {
        return !(this.policyId1 && this.policyId2 && this.policyId2.length);
    }

    ngOnInit() {
        this.loading = false;
        setTimeout(() => {
            this.onChange();
        });
    }

    setData(data: any) {
    }

    onClose(): void {
        this.ref.close(false);
    }

    onCompare() {
        if (this.disabled) {
            return;
        }
        const policyIds = [this.policyId1, ...this.policyId2];
        this.ref.close({policyIds});
    }

    onChange() {
        if (this.policyId1) {
            this.list2 = this.policies.filter((s) => s.id !== this.policyId1);
        } else {
            this.list2 = this.policies;
        }
        if (this.policyId2 && this.policyId2.length) {
            this.list1 = this.policies.filter(
                (s) => this.policyId2.indexOf(s.id) === -1
            );
        } else {
            this.list1 = this.policies;
        }
        this.changeDetector.detectChanges();
    }
}
