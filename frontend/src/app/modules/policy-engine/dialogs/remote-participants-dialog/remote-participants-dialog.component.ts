import { Component } from '@angular/core';
import { RemoteParticipantStatus } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';

/**
 * Remote participants of a public policy.
 */
@Component({
    selector: 'remote-participants-dialog',
    templateUrl: './remote-participants-dialog.component.html',
    styleUrls: ['./remote-participants-dialog.component.scss'],
    standalone: false
})
export class RemoteParticipantsDialog {
    public loading = false;
    public policy: any;
    public error: string = '';
    public page: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 10;
    public count: number = 0;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private externalPoliciesService: ExternalPoliciesService,
    ) {
        this.policy = this.config.data?.policy || {};
    }

    ngOnInit() {
        this.loadData();
    }

    private loadData() {
        this.loading = true;
        this.externalPoliciesService
            .getRemoteParticipants(this.policy.id, this.pageIndex, this.pageSize)
            .subscribe((response) => {
                const { page, count } = this.externalPoliciesService.parsePage(response);
                this.page = page;
                this.count = count;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.page = [];
                this.count = 0;
                this.loading = false;
                this.error = e?.error?.message || 'Failed to load participants.';
            });
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onPage(event: any): void {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public canApprove(row: any): boolean {
        return row.status === RemoteParticipantStatus.PENDING || row.status === RemoteParticipantStatus.REJECTED;
    }

    public canReject(row: any): boolean {
        return row.status === RemoteParticipantStatus.PENDING || row.status === RemoteParticipantStatus.APPROVED;
    }

    public getStatusName(row: any): string {
        switch (row.status) {
            case RemoteParticipantStatus.PENDING:
                return 'Pending';
            case RemoteParticipantStatus.APPROVED:
                return 'Approved';
            case RemoteParticipantStatus.REJECTED:
                return 'Rejected';
            default:
                return 'Unknown';
        }
    }

    public onApprove(row: any): void {
        this.update(this.externalPoliciesService.approveParticipant(row.id));
    }

    public onReject(row: any): void {
        this.update(this.externalPoliciesService.rejectParticipant(row.id));
    }

    private update(request: any): void {
        this.loading = true;
        this.error = '';
        request.subscribe(() => {
            this.loadData();
        }, (e: any) => {
            this.loading = false;
            this.error = e?.error?.message || 'Operation failed. Please try again.';
        });
    }
}
