import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import moment from 'moment';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { concatMap, filter, finalize, from, interval, map, Observable, Subscription, take } from 'rxjs';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { NewImportFileDialog } from '../new-import-file-dialog/new-import-file-dialog.component';
import { PolicyStatus, PolicyTestStatus } from '@guardian/interfaces';

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
    private bulkSubscription: Subscription | null = null;
    public isLargeSize: boolean = true;
    public rerunMenuOpen: boolean = false;
    public selectedDocs: { [testId: string]: Set<string> } = {};
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

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

    public addTest(): void {
        const dialogRef = this.dialogService.open(NewImportFileDialog, {
            header: 'Add Policy Tests',
            width: '600px',
            styleClass: 'custom-dialog',
            data: {
                policy: this.policy,
                fileExtension: 'record',
                label: 'Add test .record file',
                multiple: true,
                type: 'File'
            }
        });

        dialogRef.onClose.subscribe((files: File[] | null) => {
            if (!files) {
                return;
            }

            this.loading = true;
            this.policyEngineService.addPolicyTest(this.policyId, files).subscribe(() => {
                this.updateProgress(true);
            }, () => {
                this.loading = false;
            });
        });
    }

    public toggleRerunMenu($event: MouseEvent): void {
        $event.stopPropagation();
        if (!this.isRunAvailable() || this.isRunning || !(this.tests && this.tests.length)) {
            return;
        }
        this.rerunMenuOpen = !this.rerunMenuOpen;
    }

    public rerunAll(): void {
        this.rerunMenuOpen = false;
        const tests = (this.tests || []).filter((test) => test.status !== PolicyTestStatus.Running);
        this.rerunTests(tests);
    }

    public rerunFailed(): void {
        this.rerunMenuOpen = false;
        const tests = (this.tests || []).filter((test) => test.status === PolicyTestStatus.Failure);
        this.rerunTests(tests);
    }

    private replaceTest(result: any): void {
        const index = this.tests.findIndex((t: any) => t.id === result.id);
        if (index !== -1) {
            this.tests[index] = result;
        }
        this.tests = this.tests.slice();
        if (this.policy) {
            this.policy.tests = this.tests;
        }
    }

    private waitForTestCompletion(testId: string): Observable<any> {
        return interval(3000).pipe(
            concatMap(() => this.policyEngineService.policy(this.policyId)),
            map((policy: any) => {
                this.updatePolicy(policy);
                this.updateData();
                return (policy?.tests || []).find((t: any) => t.id === testId);
            }),
            filter((test: any) => !!test && test.status !== PolicyTestStatus.Running),
            take(1)
        );
    }

    public isBulkRunning(): boolean {
        return !!this.bulkSubscription;
    }

    public stopAll(): void {
        if (this.bulkSubscription) {
            this.bulkSubscription.unsubscribe();
            this.bulkSubscription = null;
        }
        const running = (this.tests || []).filter((t: any) => t.status === PolicyTestStatus.Running);
        for (const test of running) {
            this.policyEngineService.stopTest(this.policyId, test.id).subscribe();
        }
        this.updateProgress(true);
    }

    private rerunTests(tests: any[]): void {
        if (!tests.length || this.isRunning || !this.isRunAvailable()) {
            return;
        }

        this.loading = true;
        this.bulkSubscription = from(tests).pipe(
            concatMap((test) =>
                this.policyEngineService.runTest(this.policyId, test.id).pipe(
                    concatMap((result) => {
                        this.replaceTest(result);
                        this.updateData();
                        this.loading = false;
                        return this.waitForTestCompletion(result.id);
                    })
                )
            ),
            finalize(() => {
                this.bulkSubscription = null;
                this.updateProgress(true);
            })
        ).subscribe(() => {}, () => {});
    }

    public isRunAvailable(): boolean {
        return this.status === PolicyStatus.DRY_RUN || this.status === PolicyStatus.DEMO;
    }

    public canAddTest(): boolean {
        return this.status !== PolicyStatus.PUBLISH && this.status !== PolicyStatus.DISCONTINUED;
    }

    public canRerunAll(): boolean {
        return this.isRunAvailable() &&
            !this.isRunning &&
            (this.tests || []).some((test) => test.status !== PolicyTestStatus.Running);
    }

    public canRerunFailed(): boolean {
        return this.isRunAvailable() &&
            !this.isRunning &&
            (this.tests || []).some((test) => test.status === PolicyTestStatus.Failure);
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

    public isDocSelected(testId: string, index: number): boolean {
        if (!this.selectedDocs[testId]) { return true; }
        return this.selectedDocs[testId].has(String(index));
    }

    public toggleDoc(testId: string, index: number, results: any[]): void {
        if (!this.selectedDocs[testId]) {
            this.selectedDocs[testId] = new Set<string>(results.map((_, i) => String(i)));
        }
        if (this.selectedDocs[testId].has(String(index))) {
            this.selectedDocs[testId].delete(String(index));
        } else {
            this.selectedDocs[testId].add(String(index));
        }
    }

    public areAllDocsSelected(testId: string, results: any[]): boolean {
        if (!this.selectedDocs[testId]) { return !!results?.length; }
        return !!results?.length && results.every((_, i) => this.isDocSelected(testId, i));
    }

    public toggleAllDocs(testId: string, results: any[]): void {
        const allSelected = this.areAllDocsSelected(testId, results);
        this.selectedDocs[testId] = allSelected
            ? new Set<string>()
            : new Set<string>(results.map((_, i) => String(i)));
    }

    public hasAnyDocSelected(testId: string, results: any[]): boolean {
        if (!results?.length) { return false; }
        if (!this.selectedDocs[testId]) { return true; }
        return this.selectedDocs[testId].size > 0;
    }

    public getDetailsTooltip(testId: string, results: any[]): string | undefined {
        if (!results?.length) { return 'No documents were created by this test'; }
        if (!this.hasAnyDocSelected(testId, results)) { return 'No documents selected'; }
        return undefined;
    }

    public onDetails(id: any, results: any[]): void {
        if (!this.hasAnyDocSelected(id, results)) { return; }
        const test = this.tests.find((t: any) => t.id === id);
        const selected = this.selectedDocs[id];
        const docFilter = selected && selected.size > 0
            ? Array.from(selected).join(',')
            : null;
        this.ref.close(null);
        this.router.navigate(['/test-results'], {
            queryParams: {
                type: 'policy',
                policyId: this.policyId,
                testId: id,
                policyName: this.policy?.name || '',
                testName: test?.name || '',
                testStatus: test?.status || '',
                ...(docFilter ? { docFilter } : {})
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
            width: '90%',
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

    public toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
