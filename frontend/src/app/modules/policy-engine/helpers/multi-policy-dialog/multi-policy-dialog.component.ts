import { AfterContentInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'multi-policy-dialog',
    templateUrl: './multi-policy-dialog.component.html',
    styleUrls: ['./multi-policy-dialog.component.scss']
})
export class MultiPolicyDialogComponent implements OnInit, AfterContentInit {
    loading = false;
    initDialog = false;
    policyId!: string;
    exists: boolean = true;
    policyType: string = '';
    mainPolicyTopicId1: any;
    synchronizationTopicId1: any;
    mainPolicyTopicId2: any;
    synchronizationTopicId2: any;
    policyData: any;
    link1: any;
    link2: any;
    valid: boolean = true;
    instanceTopicId: any;

    constructor(
        public dialogRef: MatDialogRef<MultiPolicyDialogComponent>,
        private policyEngineService: PolicyEngineService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.policyId = data.policyId;
    }

    ngOnInit() {
        this.loading = true;
        this.policyEngineService.getMultiPolicy(this.policyId).subscribe((result) => {
            this.policyData = result;
            this.exists = !!this.policyData.type;
            if (this.exists) {
                this.policyType = this.policyData.type;
                this.instanceTopicId = this.policyData.instanceTopicId;
                this.mainPolicyTopicId1 = this.policyData.mainPolicyTopicId;
                this.synchronizationTopicId1 = this.policyData.synchronizationTopicId;
                this.link1 = btoa(JSON.stringify({
                    mainPolicyTopicId: this.policyData.mainPolicyTopicId,
                    synchronizationTopicId: this.policyData.synchronizationTopicId,
                }));
            } else {
                this.policyType = 'Main';
                this.mainPolicyTopicId1 = this.policyData.mainPolicyTopicId;
                this.synchronizationTopicId1 = this.policyData.synchronizationTopicId;
                this.link1 = btoa(JSON.stringify({
                    mainPolicyTopicId: this.policyData.mainPolicyTopicId,
                    synchronizationTopicId: this.policyData.synchronizationTopicId,
                }));
            }
            if (this.policyType == 'Main') {
                this.valid = !!this.synchronizationTopicId1;
            } else {
                this.valid = !!this.synchronizationTopicId2;
            }

            setTimeout(() => {
                this.loading = false;
            }, 100);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;
        }, 100);
    }

    onOk(): void {
        this.dialogRef.close();
    }

    onInvite() {
        this.loading = true;
        this.policyEngineService.getMultiPolicy(this.policyId).subscribe((result) => {
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    onChange(event: any) {
        this.policyType = event.value;
        if (this.policyType == 'Main') {
            this.valid = !!this.synchronizationTopicId1;
        } else {
            this.valid = !!this.synchronizationTopicId2;
        }
    }

    onParse(event: any) {
        if (event) {
            try {
                const json = JSON.parse(atob(event));
                this.mainPolicyTopicId2 = json.mainPolicyTopicId || '';
                this.synchronizationTopicId2 = json.synchronizationTopicId || '';
                this.valid = !!this.synchronizationTopicId2;
            } catch (error) {
                this.mainPolicyTopicId2 = '';
                this.synchronizationTopicId2 = '';
                this.valid = !!this.synchronizationTopicId2;
            }
        }
    }

    onCreate() {
        const data = this.policyType == 'Main' ? {
            mainPolicyTopicId: this.mainPolicyTopicId1,
            synchronizationTopicId: this.synchronizationTopicId1,
        } : {
            mainPolicyTopicId: this.mainPolicyTopicId2,
            synchronizationTopicId: this.synchronizationTopicId2,
        };
        this.loading = true;
        this.policyEngineService.setMultiPolicy(this.policyId, data).subscribe((result) => {
            this.dialogRef.close();
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
