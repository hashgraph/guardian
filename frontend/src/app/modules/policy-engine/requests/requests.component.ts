import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, ExternalPolicyStatus, LocationType, PolicyActionStatus, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { filter, forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { SearchExternalPolicyDialog } from '../dialogs/search-external-policy-dialog/search-external-policy-dialog.component';
import { VCViewerDialog } from '../../schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

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
    selector: 'app-policy-requests',
    templateUrl: './requests.component.html',
    styleUrls: ['./requests.component.scss'],
})
export class PolicyRequestsComponent implements OnInit {
    public readonly title: string = 'Policy Requests';

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

    public allPolicies: any[] = [];
    public currentPolicy: any = null;
    public currentPolicyId: string;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private externalPoliciesService: ExternalPoliciesService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute,
        private wsService: WebSocketService
    ) {
        this._defaultColumns = [
            {
                id: 'policyName',
                title: 'Name',
                type: 'text',
                size: '200',
                tooltip: true
            },
            {
                id: 'status',
                title: 'Status',
                type: 'text',
                size: '180',
                tooltip: false
            },
            {
                id: 'topicId',
                title: 'Topic',
                type: 'text',
                size: '135',
                tooltip: true
            },
            {
                id: 'documentType',
                title: 'Document Type',
                type: 'text',
                size: '140',
                tooltip: true,
            },
            {
                id: 'messageId',
                title: 'Message',
                type: 'text',
                size: '200',
                tooltip: true
            },
            {
                id: 'blockTag',
                title: 'Block Tag',
                type: 'text',
                size: '150',
                tooltip: true
            },
            {
                id: 'options',
                title: '',
                type: 'text',
                size: '180',
                tooltip: false
            },
            {
                id: 'operations',
                title: '',
                type: 'text',
                size: '220',
                tooltip: false
            }
        ];

        this.columns = [...this._defaultColumns];
    }

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                if (queryParams.policyId) {
                    this.currentPolicyId = queryParams.policyId;
                }
                this.loadProfile();
            })
        );
        this.subscription.add(
            this.wsService.requestSubscribe((message) => {
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
            this.policyEngineService.all(LocationType.REMOTE),
        ]).subscribe(([profile, remotePolicies]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;

            this.allPolicies = [...remotePolicies];
            this.allPolicies = this.allPolicies.filter((p) => p.status === PolicyStatus.VIEW);
            this.allPolicies.unshift({
                name: 'All',
            });
            this.allPolicies.forEach((p: any) => p.label = p.name);

            if (this.currentPolicyId) {
                const policy = this.allPolicies.find((p: any) => p.id === this.currentPolicyId);
                if (policy) {
                    this.currentPolicy = policy;
                }
            }

            if (this.user.POLICIES_EXTERNAL_POLICY_UPDATE) {
                this.columns = [...this._defaultColumns, {
                    id: 'options',
                    title: 'Options',
                    type: 'text',
                    size: '180',
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

        if (this.currentPolicy) {
            filters.policyId = this.currentPolicy.id;
        }

        this.externalPoliciesService
            .getActionRequests(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.externalPoliciesService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onBack(id?: string) {
        if (id) {
            this.router.navigate(['/policy-viewer', id]);
        } else {
            this.router.navigate(['/policy-viewer']);
        }
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

    public onApprove(item: any) {
        this.loading = true;
        this.externalPoliciesService
            .approveAction(item.messageId)
            .subscribe((result) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    public onReject(item: any) {
        this.loading = true;
        this.externalPoliciesService
            .rejectAction(item.messageId)
            .subscribe((result) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    getStatusName(row: any) {
        switch (row.status) {
            case PolicyActionStatus.NEW:
                return 'New';
            case PolicyActionStatus.COMPLETED:
                return 'Completed';
            case PolicyActionStatus.REJECT:
                return 'Rejected';
            case PolicyActionStatus.ERROR:
                return 'Error';
            default:
                return 'Incorrect status';
        }
    }

    public openVCDocument(document: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                row: null,
                document: document,
                title: 'Document',
                type: 'JSON',
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }
}