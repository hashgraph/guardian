import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

@Component({
    selector: 'policy-test-dialog',
    templateUrl: './policy-test-dialog.component.html',
    styleUrls: ['./policy-test-dialog.component.scss'],
})
export class PolicyTestDialog {
    public loading = true;
    public policy: any;
    public tests: any[];
    public policyId: any;
    public status: string;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private policyEngineService: PolicyEngineService
    ) {
        this.policy = this.config.data?.policy;
        this.tests = this.policy?.tests || [];
        this.policyId = this.policy?.id;
        this.status = this.policy?.status;
    }

    ngOnInit() {
        this.loading = false;
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public runTest(item: any) {
        this.loading = true;
        this.policyEngineService
            .runTest(this.policyId, item.id)
            .subscribe((result) => {

                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }

    public deleteTest(item: any) {
        this.loading = true;
        this.policyEngineService
            .deleteTest(this.policyId, item.id)
            .subscribe((result) => {
                this.tests = this.tests.filter((t: any) => t !== item);
                setTimeout(() => {
                    this.loading = false;
                }, 500)
            }, (e) => {
                this.loading = false;
            });
    }
}
