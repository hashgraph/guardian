import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExternalPolicyStatus, UserPermissions, UserRole } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import { SearchExternalPolicyDialog } from '../dialogs/search-external-policy-dialog/search-external-policy-dialog.component';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';

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
})
export class ExternalPolicyComponent implements OnInit {
    public title: string = 'Remote Policy Request';

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

    constructor(
        private profileService: ProfileService,
        private externalPoliciesService: ExternalPoliciesService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
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
            title: 'Message',
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

            if (this.user.POLICIES_EXTERNAL_POLICY_UPDATE) {
                this.columns = [...this._defaultColumns, {
                    id: 'options',
                    title: 'Options',
                    type: 'text',
                    size: '200',
                    tooltip: false
                }];
            } else {
                this.columns = [...this._defaultColumns];
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

    public onImport() {
        const dialogRef = this.dialogService.open(SearchExternalPolicyDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
        });
        dialogRef.onClose.subscribe(async (result: any | null) => {
            if (result) {
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
                header: 'Delete tab',
                text: 'Are you sure want to disconnect this policy?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Disconnect',
                    class: 'delete'
                }]
            },
        });
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

    public onUsers() {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete tab',
                text: 'Are you sure want to disconnect this policy?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Disconnect',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => { });
    }
}
