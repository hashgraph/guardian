import { Component, EventEmitter, Input, Output } from '@angular/core';
import moment from 'moment';
import { PolicyTestDialog } from '../../dialogs/policy-test-dialog/policy-test-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { PolicyStatus } from '@guardian/interfaces';

/**
 * Help Icon
 */
@Component({
    selector: 'policy-test-result',
    templateUrl: './policy-test-result.component.html',
    styleUrls: ['./policy-test-result.component.scss']
})
export class PolicyTestResult {
    @Input('policy') policy!: any;
    @Input('tests') tests!: any[];
    @Output('run-test') runTest = new EventEmitter<any>();
    @Output('add-test') addTest = new EventEmitter<any>();

    public policyId: any;
    public status: any;
    public last: any;
    public isRunning: boolean;

    constructor(
        private dialogService: DialogService,
    ) {
    }

    ngOnInit(): void {
        this.update();
    }

    ngOnChanges(changes: any): void {
        this.update();
    }

    ngOnDestroy(): void {

    }

    private update() {
        this.status = this.policy?.status;
        this.policyId = this.policy?.id;
        this.isRunning = false;
        if (this.tests) {
            let last = null;
            let lastDate = -1;
            for (const test of this.tests) {
                this.isRunning = this.isRunning || test.status === 'Running';
                let momentDate = moment(test.date);
                if (momentDate.isValid()) {
                    const date = momentDate.valueOf();
                    if (date > lastDate) {
                        lastDate = date;
                        last = test;
                    }
                }
            }
            if (last) {
                this.last = last;
            } else {
                this.last = this.tests[0];
            }
        }
    }

    public getDate(date: string, status: string) {
        if (status === 'Running') {
            return 'Running...'
        }
        let momentDate = moment(date);
        if (momentDate.isValid()) {
            return momentDate.format("YYYY/MM/DD");
        } else {
            return 'N\\A';
        }
    }

    public onDetails(last: any) {
        const dialogRef = this.dialogService.open(PolicyTestDialog, {
            showHeader: false,
            header: 'Policy Tests',
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {
                policy: this.policy,
                test: last
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onRun(last: any) {
        if ((this.status === PolicyStatus.DRY_RUN || this.status === PolicyStatus.DEMO)) {
            this.runTest.emit({ policy: this.policy, test: last })
        }
    }

    public onAdd() {
        if (!(this.status === 'PUBLISH' || this.status === 'DISCONTINUED')) {
            this.addTest.emit({ policy: this.policy })
        }
    }

    public isRun(policy: any): boolean {
        return policy.status === PolicyStatus.DRY_RUN || policy.status === PolicyStatus.DEMO;
    }

    public isPublished(policy: any): boolean {
        return policy.status === PolicyStatus.PUBLISH || policy.status === PolicyStatus.DISCONTINUED;
    }
}