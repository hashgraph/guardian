import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'compare-policy-dialog',
    templateUrl: './compare-policy-dialog.component.html',
    styleUrls: ['./compare-policy-dialog.component.css']
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
        public dialogRef: MatDialogRef<ComparePolicyDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.policy = data.policy;
        this.policies = data.policies || [];
        this.policyId1 = this.policy?.id;
        this.list1 = this.policies;
        this.list2 = this.policies;
    }

    public get disabled(): boolean {
        return !(this.policyId1 && this.policyId2 && this.policyId2.length);
    }

    ngOnInit() {
        this.loading = false;
    }

    setData(data: any) {
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    onCompare() {
        if (this.disabled) {
            return;
        }
        const policyIds = [this.policyId1, ...this.policyId2];
        this.dialogRef.close({ policyIds });
    }

    onChange() {
        if (this.policyId1) {
            this.list2 = this.policies.filter(s => s.id !== this.policyId1);
        } else {
            this.list2 = this.policies;
        }
        if (this.policyId2 && this.policyId2.length) {
            this.list1 = this.policies.filter(s => this.policyId2.indexOf(s.id) === -1);
        } else {
            this.list1 = this.policies;
        }
    }
}