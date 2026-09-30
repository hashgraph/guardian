import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExternalPolicyStatus, RemoteJoinStatus, RemotePolicyInvite, UserPermissions, UserRole } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import { SearchExternalPolicyDialog } from '../dialogs/search-external-policy-dialog/search-external-policy-dialog.component';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ToastService } from 'src/app/services/toast.service';
import { GridDialogComponent } from '../../common/grid-dialog/grid-dialog.component';

interface IColumn {
    id: string;
    title: string;
    type: string;
    size: string;
    tooltip: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}

@Component({
    selector: 'app-external-policies',
    templateUrl: './external-policies.component.html',
    styleUrls: ['./external-policies.component.scss'],
    standalone: false
})
export class ExternalPolicyComponent implements OnInit {
    public title: string = 'Remote Policy Requests';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];
    private _defaultColumns: IColumn[];

    private subscription = new Subscription();
    private pendingInvite: string | null = null;

    constructor(
        private profileService: ProfileService,
        private externalPoliciesService: ExternalPoliciesService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    ) {
        this._defaultColumns = [{
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: true
        }, {
            id: 'description',
            title: 'Description',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'version',
            title: 'Version',
            type: 'text',
            size: '100',
            tooltip: false
        }, {
            id: 'topicId',
            title: 'Topic',
            type: 'text',
            size: '135',
            tooltip: false
        }, {
            id: 'messageId',
            title: 'Policy Public ID',
            type: 'text',
            size: '210',
            tooltip: false
        }, {
            id: 'userCount',
            title: 'Users',
            type: 'text',
            size: '100',
            tooltip: false
        }, {
            id: 'status',
            title: 'Status',
            type: 'text',
            size: '135',
            tooltip: false
        }];
        this.columns = [...this._defaultColumns];
    }

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.pendingInvite = RemotePolicyInvite.decode(
            this.route.snapshot.queryParams[RemotePolicyInvite.QUERY_PARAM]
        );
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
        ]).subscribe(([profile]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;

            this.openPendingInvite();

            if (this.user.POLICIES_EXTERNAL_POLICY_UPDATE) {
                this.columns = [...this._defaultColumns, {
                    id: 'options',
                    title: 'Options',
                    type: 'text',
                    size: '200',
                    tooltip: false
                }];
            } else {
                this.columns = [...this._defaultColumns, {
                    id: 'participation',
                    title: 'Participation',
                    type: 'text',
                    size: '230',
                    tooltip: false
                }];
            }

            if (this.isConfirmed) {
                this.loadData();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadData() {
        const filters: any = {};
        this.loading = true;
        this.externalPoliciesService
            .getPolicyRequests(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.externalPoliciesService.parsePage(response);
                this.page = page || [];
                this.pageCount = count;
                for (const item of this.page) {
                    item.userCount = 0;
                    item.types = item.types || [];
                    for (const user of item.types) {
                        user.type = user.type || 'IMPORT';
                        if (user.type === 'IMPORT') {
                            item.userCount++;
                        }
                        user.typeName = user.type === 'IMPORT' ? 'Imported' : 'Disconnected';
                        user.participation = this.getJoinStatusName(user);
                    }
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onBack() {
        this.router.navigate(['/policy-viewer']);
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public onFilter(event: any) {
        this.pageIndex = 0;
        // this.router.navigate(['/policy-labels'], { queryParams: { topic } });
        this.loadData();
    }

    public onEdit(item: any) {
        this.router.navigate(['/policy-labels', item.id]);
    }

    private openPendingInvite() {
        if (!this.pendingInvite) {
            return;
        }
        const messageId = this.pendingInvite;
        this.pendingInvite = null;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { [RemotePolicyInvite.QUERY_PARAM]: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
        if (this.user.POLICIES_EXTERNAL_POLICY_CREATE) {
            this.onImport(messageId);
        }
    }

    public onImport(messageId?: string) {
        const dialogRef = this.dialogService.open(SearchExternalPolicyDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: { messageId },
        })!;
        dialogRef.onClose.subscribe(async (result: any | null) => {
            if (result) {
                this.toastService.success('Import requested');
                this.loadData();
            }
        });
    }

    public onDisconnect(policy: any) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete',
                text: 'Are you sure want to disconnect this policy?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Disconnect',
                    class: 'delete'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Disconnect') {
                this.loading = true;
                this.externalPoliciesService
                    .delete(policy.messageId)
                    .subscribe((result) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onApprove(item: any) {
        this.loading = true;
        this.externalPoliciesService
            .pushApprove(item.messageId)
            .subscribe((result) => {
                const { taskId, expectation } = result;
                this.router.navigate(['task', taskId], {
                    queryParams: {
                        last: btoa(location.href),
                    },
                });
            }, (e) => {
                this.loading = false;
            });
    }

    public onReject(item: any) {
        this.loading = true;
        this.externalPoliciesService
            .reject(item.messageId)
            .subscribe((result) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    public getStatusName(row: any) {
        switch (row.fullStatus) {
            case ExternalPolicyStatus.NEW:
                return 'New';
            case ExternalPolicyStatus.APPROVED:
                return 'Approved';
            case ExternalPolicyStatus.REJECTED:
                return 'Rejected';
            default:
                return 'Incorrect status';
        }
    }

    public getJoinStatusName(entry: any): string {
        if (!entry) {
            return '';
        }
        switch (entry.status) {
            case ExternalPolicyStatus.NEW:
                return 'Awaiting home approval';
            case ExternalPolicyStatus.REJECTED:
                return 'Rejected by the home instance';
            case ExternalPolicyStatus.APPROVED:
                switch (entry.joinStatus) {
                    case RemoteJoinStatus.SENT:
                        return 'Awaiting Main approval';
                    case RemoteJoinStatus.ACCEPTED:
                        return 'Ready';
                    case RemoteJoinStatus.REJECTED:
                        return 'Rejected by the Main instance';
                    case RemoteJoinStatus.FAILED:
                        return 'Join request failed';
                    default:
                        return 'Approved';
                }
            default:
                return '';
        }
    }

    public getJoinStatusClass(entry: any): string {
        switch (this.getJoinStatusName(entry)) {
            case 'Ready':
            case 'Approved':
                return 'APPROVED-status';
            case 'Rejected by the home instance':
            case 'Rejected by the Main instance':
            case 'Join request failed':
                return 'REJECTED-status';
            default:
                return 'NEW-status';
        }
    }

    public getJoinStatusTooltip(entry: any): string {
        if (entry?.joinStatus === RemoteJoinStatus.FAILED && entry.status === ExternalPolicyStatus.APPROVED) {
            return `${entry.joinError || ''} Import the policy again to retry.`.trim();
        }
        return '';
    }

    public onUsers(row: any) {
        const dialogRef = this.dialogService.open(GridDialogComponent, {
            showHeader: false,
            width: '760px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Users',
                columns: [{
                    id: 'username',
                    title: 'User',
                    width: 'auto',
                    field: 'username'
                }, {
                    id: 'username',
                    title: 'Status',
                    width: '150',
                    field: 'typeName',
                    colClass: (column: any, row: any) =>{
                        return row.type === 'IMPORT' ? 'label-approved' : 'label-rejected';
                    }
                }, {
                    id: 'participation',
                    title: 'Participation',
                    width: '230',
                    field: 'participation',
                    colClass: (column: any, entry: any) => {
                        switch (this.getJoinStatusClass(entry)) {
                            case 'APPROVED-status':
                                return 'label-approved';
                            case 'REJECTED-status':
                                return 'label-rejected';
                            default:
                                return '';
                        }
                    }
                }],
                height: 52,
                data: row.types,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => { });
    }
}
