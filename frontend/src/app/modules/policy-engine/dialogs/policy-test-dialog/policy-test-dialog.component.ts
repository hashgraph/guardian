import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import moment from 'moment';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { Subscription } from 'rxjs';
import { WebSocketService } from 'src/app/services/web-socket.service';

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
    public isRunning: boolean;
    private lastUpdate: any;
    private expandMap: Set<string> = new Set<string>();
    private subscription = new Subscription();

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private router: Router
    ) {
        this.policy = this.config.data?.policy;
        this.tests = this.policy?.tests || [];
        this.policyId = this.policy?.id;
        this.status = this.policy?.status;
        const target = this.config.data?.test;
        if (target) {
            this.expandMap.add(target.id);
        }
        this.updateData();
    }

    ngOnInit() {
        this.subscription.add(
            this.wsService.testSubscribe(((test) => {
                const needRefresh = this.updateTest(test);
                if (needRefresh) {
                    this.updateProgress(false);
                } else {
                    this.updateData();
                }
            }))
        );
        this.loading = true;
        this.updateProgress(true);
        this.lastUpdate = setInterval(() => {
            this.updateProgress(false);
        }, 10000)
    }

    ngOnDestroy(): void {
        clearInterval(this.lastUpdate);
        this.subscription.unsubscribe();
    }

    private updateTest(newTest: any) {
        if (!newTest || !this.tests || !this.policy || this.policy.id !== newTest.policyId) {
            return false;
        }
        const target = this.tests.find((t) => t.id === newTest.id);
        if (!target) {
            return false;
        }

        if (newTest.status !== 'Running') {
            return true;
        } else {
            const needRefresh = target.status !== newTest.status;
            target.date = newTest.date;
            target.progress = newTest.progress;
            target.status = newTest.status;
            return needRefresh;
        }
    }

    private updatePolicy(newPolicy: any) {
        this.policy = Object.assign(this.policy, newPolicy);
        if (newPolicy.tests) {
            for (let index = 0; index < newPolicy.tests.length; index++) {
                const old = this.tests[index];
                const test = newPolicy.tests[index];
                if (old && old.id === test.id) {
                    Object.assign(this.tests[index], test);
                } else {
                    this.tests[index] = test;
                }
            }
        }
    }

    private updateData() {
        this.isRunning = false;
        for (const test of this.tests) {
            test.__result = this.getResults(test);
            this.isRunning = this.isRunning || test.status === 'Running';
        }
    }

    public getExpand(item: any): boolean {
        return this.expandMap.has(item.id);
    }

    public getDate(date: string) {
        const momentDate = moment(date);
        if (momentDate.isValid()) {
            return momentDate.format("YYYY/MM/DD, HH:mm:ss");
        } else {
            return 'N\\A';
        }
    }

    public getText(text: string) {
        if (text) {
            return text;
        } else {
            return 'N\\A';
        }
    }

    public getTime(duration: number) {
        if (!duration) {
            return 'N\\A';
        }
        const momentDate = moment.duration(duration);
        if (momentDate.isValid()) {
            return momentDate.humanize();
        } else {
            return 'N\\A';
        }
    }

    public diffTime(test: any) {
        const _diff = moment.duration(test.duration - moment(new Date()).diff(moment(test.date)) + 20000);
        if (_diff.isValid()) {
            return _diff.humanize();
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

    public getResults(test: any) {
        const s1 = test.error ? 'Failure' : 'Success';
        const s2 = test.result ? (test.result.total === 100 ? 'Success' : 'Failure') : 'Skipped';
        return {
            runStep: {
                id: test.id,
                status: s1,
                error: test.error
            },
            compareStep: {
                id: test.id,
                status: s2,
                report: test.result
            }
        }
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public updateProgress(loading: boolean) {
        if (loading) {
            this.loading = true;
        }
        this.policyEngineService
            .policy(this.policyId)
            .subscribe((result) => {
                this.updatePolicy(result)
                this.updateData();
                if (loading) {
                    this.loading = false;
                }
            }, (e) => {
                if (loading) {
                    this.loading = false;
                }
            });
    }

    public runTest(item: any, $event: any) {
        $event.stopPropagation();
        this.loading = true;
        this.policyEngineService
            .runTest(this.policyId, item.id)
            .subscribe((result) => {
                const index = this.tests.findIndex((t: any) => t === item);
                this.tests[index] = result;
                this.tests = this.tests.slice();
                if (this.policy) {
                    this.policy.tests = this.tests;
                }
                this.updateData();
                setTimeout(() => {
                    this.loading = false;
                }, 500)
            }, (e) => {
                this.loading = false;
            });
    }

    public stopTest(item: any, $event: any) {
        $event.stopPropagation();
        this.loading = true;
        this.policyEngineService
            .stopTest(this.policyId, item.id)
            .subscribe((result) => {
                const index = this.tests.findIndex((t: any) => t === item);
                this.tests[index] = result;
                this.tests = this.tests.slice();
                if (this.policy) {
                    this.policy.tests = this.tests;
                }
                this.updateData();
                setTimeout(() => {
                    this.loading = false;
                }, 500)
            }, (e) => {
                this.loading = false;
            });
    }

    public deleteTest(item: any, $event: any) {
        $event.stopPropagation();
        if (item.status === 'Running') {
            return;
        }
        this.loading = true;
        this.policyEngineService
            .deleteTest(this.policyId, item.id)
            .subscribe((result) => {
                this.tests = this.tests.filter((t: any) => t !== item);
                if (this.policy) {
                    this.policy.tests = this.tests;
                }
                this.updateData();
                setTimeout(() => {
                    this.loading = false;
                }, 500)
            }, (e) => {
                this.loading = false;
            });
    }

    public onDetails(id: any): void {
        this.ref.close(null);
        this.router.navigate(['/test-results'], {
            queryParams: {
                type: 'policy',
                policyId: this.policyId,
                testId: id
            }
        });
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
            showHeader: false,
            width: '850px',
            styleClass: 'guardian-dialog',
            data: {
                title: title,
                id: document.id,
                row: item,
                document: document,
                dryRun: true,
                type: 'JSON',
            }
        });
        dialogRef.onClose.subscribe(async (result) => {});
    }
}
