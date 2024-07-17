import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import moment from 'moment';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';

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
    private lastUpdate: any;
    private expandMap: Set<string> = new Set<string>();

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private policyEngineService: PolicyEngineService,
        private router: Router
    ) {
        this.policy = this.config.data?.policy;
        this.tests = this.policy?.tests || [];
        this.policyId = this.policy?.id;
        this.status = this.policy?.status;
    }

    ngOnInit() {
        this.loading = false;
        this.lastUpdate = setInterval(() => {
            this.updateProgress();
        }, 5000)
    }

    ngOnDestroy(): void {
        clearInterval(this.lastUpdate);
    }

    public getExpand(item: any): boolean {
        return this.expandMap.has(item.id);
    }

    public getDate(date: string) {
        let momentDate = moment(date);
        if (momentDate.isValid()) {
            return momentDate.format("YYYY-MM-DD, HH:mm:ss");
        } else {
            return 'N\\A';
        }
    }

    public getTime(duration: number) {
        let momentDate = moment.duration(duration);
        if (momentDate.isValid()) {
            return momentDate.humanize();
        } else {
            return 'N\\A';
        }
    }

    public getProgress(progress: string) {
        if (progress) {
            return `${progress}%`;
        } else {
            return `0%`;
        }
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public updateProgress() {
        this.policyEngineService
            .policy(this.policyId)
            .subscribe((result) => {
                this.tests = result.tests;
            }, (e) => {
            });
    }

    public runTest(item: any, $event:any) {
        $event.stopPropagation();
        this.loading = true;
        this.policyEngineService
            .runTest(this.policyId, item.id)
            .subscribe((result) => {
                const index = this.tests.findIndex((t: any) => t === item);
                this.tests[index] = result;
                this.tests = this.tests.slice();
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }

    public stopTest(item: any, $event:any) {
        $event.stopPropagation();
        this.loading = true;
        this.policyEngineService
            .runTest(this.policyId, item.id)
            .subscribe((result) => {
                const index = this.tests.findIndex((t: any) => t === item);
                this.tests[index] = result;
                this.tests = this.tests.slice();
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }
    public deleteTest(item: any, $event:any) {
        $event.stopPropagation();
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

    public onDetails(): void {
        this.ref.close(null);
        this.router.navigate(['policy-viewer', this.policyId]);
    }

    public expand(item: any) {
        if (item.result || item.error) {
            if (this.expandMap.has(item.id)) {
                this.expandMap.delete(item.id)
            } else {
                this.expandMap.add(item.id)
            }
        }
    }

    public openDocument(item: any): void {
        const document = item.document;
        const title = `${item.type.toUpperCase()} Document`;
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            width: '850px',
            closable: true,
            header: 'Document',
            styleClass: 'custom-dialog',
            data: {
                id: document.id,
                dryRun: true,
                document: document,
                title: title,
                type: 'JSON',
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }
}
