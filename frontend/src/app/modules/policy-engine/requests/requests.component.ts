import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationType, PolicyActionStatus, PolicyActionType, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { debounceTime, firstValueFrom, forkJoin, Subject, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { VCViewerDialog } from '../../schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { ToastService } from 'src/app/services/toast.service';

interface IColumn {
    id: string;
    title: string;
    type: string;
    size: string;
    tooltip: boolean;
    sortField?: string;
    technical?: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}

interface IBulkProgress {
    label: string;
    total: number;
    done: number;
    running: boolean;
    failures: { name: string, message: string }[];
}

type BulkKind = 'approve' | 'reject';

const DEFAULT_SORT_FIELD = 'createDate';
const DEFAULT_SORT_ORDER = -1;

@Component({
    selector: 'app-policy-requests',
    templateUrl: './requests.component.html',
    styleUrls: ['./requests.component.scss'],
    standalone: false
})
export class PolicyRequestsComponent implements OnInit, OnDestroy {
    public readonly title: string = 'Incoming Requests';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public isLocalUser: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];
    public showTechnical: boolean = false;
    private _defaultColumns: IColumn[];

    public allPolicies: any[] = [];
    public currentPolicy: any = null;
    public currentPolicyId: string = '';
    public currentType: string = '';
    public currentStatus: string = '';

    public sortField: string = DEFAULT_SORT_FIELD;
    public sortOrder: number = DEFAULT_SORT_ORDER;

    public selected = new Set<string>();
    public bulk: IBulkProgress | null = null;

    public types = [{
        name: 'All',
        value: ''
    }, {
        name: 'Actions',
        value: 'ACTION'
    }, {
        name: 'Requests',
        value: 'REQUEST'
    }];

    public statuses = [{
        name: 'All',
        value: ''
    }, {
        name: 'New',
        value: 'NEW'
    }, {
        name: 'Completed',
        value: 'COMPLETED'
    }, {
        name: 'Rejected',
        value: 'REJECTED'
    }, {
        name: 'Canceled',
        value: 'CANCELED'
    }, {
        name: 'Error',
        value: 'ERROR'
    }];

    private subscription = new Subscription();
    private dataSubscription: Subscription | null = null;
    private profileLoaded: boolean = false;
    private readonly refresh = new Subject<void>();

    constructor(
        private profileService: ProfileService,
        private externalPoliciesService: ExternalPoliciesService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private toastService: ToastService,
        private router: Router,
        private route: ActivatedRoute,
        private wsService: WebSocketService
    ) {
        this._defaultColumns = [
            {
                id: 'select',
                title: '',
                type: 'button',
                size: '44',
                tooltip: false,
                canDisplay: () => this.isLocalUser
            },
            {
                id: 'createDate',
                title: 'Created',
                type: 'text',
                size: '160',
                tooltip: false,
                sortField: 'createDate'
            },
            {
                id: 'policyName',
                title: 'Policy',
                type: 'text',
                size: '200',
                tooltip: true
            },
            {
                id: 'operationType',
                title: 'Operation',
                type: 'text',
                size: '200',
                tooltip: true,
                sortField: 'documentType'
            },
            {
                id: 'type',
                title: 'Type',
                type: 'text',
                size: '120',
                tooltip: false,
                sortField: 'type'
            },
            {
                id: 'status',
                title: 'Status',
                type: 'text',
                size: '140',
                tooltip: false,
                sortField: 'status'
            },
            {
                id: 'options',
                title: '',
                type: 'text',
                size: '220',
                tooltip: false
            },
            {
                id: 'operations',
                title: '',
                type: 'text',
                size: '180',
                tooltip: false
            },
            {
                id: 'topicId',
                title: 'Topic',
                type: 'text',
                size: '135',
                tooltip: true,
                technical: true,
                sortField: 'topicId'
            },
            {
                id: 'messageId',
                title: 'Message ID',
                type: 'text',
                size: '200',
                tooltip: true,
                technical: true
            },
            {
                id: 'blockTag',
                title: 'Block Tag',
                type: 'text',
                size: '150',
                tooltip: true,
                technical: true,
                sortField: 'blockTag'
            }
        ];

        this.columns = this.getColumns();
    }

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                const policyId = queryParams.policyId || '';
                const type = this.types.find((t) => t.value === queryParams.type)?.value || '';
                const status = this.statuses.find((s) => s.value === queryParams.status)?.value || '';
                const sortField = this._defaultColumns.some((c) => c.sortField === queryParams.sortField)
                    ? queryParams.sortField
                    : DEFAULT_SORT_FIELD;
                const sortOrder = queryParams.sortField && queryParams.sortOrder === 'asc'
                    ? 1
                    : DEFAULT_SORT_ORDER;

                const changed = policyId !== this.currentPolicyId ||
                    type !== this.currentType ||
                    status !== this.currentStatus ||
                    sortField !== this.sortField ||
                    sortOrder !== this.sortOrder;

                this.currentPolicyId = policyId;
                this.currentType = type;
                this.currentStatus = status;
                this.sortField = sortField;
                this.sortOrder = sortOrder;

                if (!this.profileLoaded) {
                    this.loadProfile();
                } else if (changed) {
                    this.currentPolicy = this.findPolicy(policyId);
                    this.pageIndex = 0;
                    this.loadData();
                }
            })
        );
        this.subscription.add(
            this.wsService.requestSubscribe((message) => {
                const policyId = message?.data?.policyId;
                if (this.currentPolicyId && policyId && policyId !== this.currentPolicyId) {
                    return;
                }
                this.refresh.next();
            })
        );
        this.subscription.add(
            this.refresh.pipe(debounceTime(500)).subscribe(() => {
                if (this.isConfirmed && !this.bulk?.running) {
                    this.loadData(true);
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.dataSubscription?.unsubscribe();
    }

    private getColumns(): IColumn[] {
        return this._defaultColumns.filter((c) => this.showTechnical || !c.technical);
    }

    private findPolicy(policyId: string): any {
        if (!policyId) {
            return null;
        }
        return this.allPolicies.find((p: any) => p.id === policyId) || null;
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(LocationType.REMOTE),
        ]).subscribe(([profile, remotePolicies]) => {
            this.profileLoaded = true;
            this.isConfirmed = !!(profile && profile.confirmed);
            this.isLocalUser = profile.location === LocationType.LOCAL;
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;

            this.allPolicies = [...remotePolicies];
            this.allPolicies = this.allPolicies.filter((p) => p.status === PolicyStatus.VIEW);
            this.allPolicies.unshift({
                name: 'All',
            });
            this.allPolicies.forEach((p: any) => p.label = p.name);

            this.currentPolicy = this.findPolicy(this.currentPolicyId);

            if (this.isConfirmed) {
                this.loadData();
            } else {
                this.loading = false;
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadData(silent: boolean = false) {
        const filters: any = {};
        if (!silent) {
            this.loading = true;
        }

        if (this.currentPolicy) {
            filters.policyId = this.currentPolicy.id;
        }
        if (this.currentStatus) {
            filters.status = this.currentStatus;
        }
        if (this.currentType) {
            filters.type = this.currentType;
        }
        filters.sortField = this.sortField;
        filters.sortDirection = this.sortOrder === 1 ? 'asc' : 'desc';

        this.dataSubscription?.unsubscribe();
        this.dataSubscription = this.externalPoliciesService
            .getActionRequests(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.externalPoliciesService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                this.pruneSelection();
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }

    private updateUrl() {
        const queryParams: any = {
            policyId: this.currentPolicyId || null,
            type: this.currentType || null,
            status: this.currentStatus || null,
            sortField: null,
            sortOrder: null
        };
        if (this.sortField !== DEFAULT_SORT_FIELD || this.sortOrder !== DEFAULT_SORT_ORDER) {
            queryParams.sortField = this.sortField;
            queryParams.sortOrder = this.sortOrder === 1 ? 'asc' : 'desc';
        }
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: 'merge',
            replaceUrl: true
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
        if (this.pageSize !== event.pageSize) {
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
        this.currentPolicyId = this.currentPolicy?.id || '';
        this.updateUrl();
        this.loadData();
    }

    public onSort(event: { field: string, order: number }) {
        if (!event?.field) {
            return;
        }
        // A non-lazy table with customSort emits this again whenever its rows change,
        // so only a click that changes the sort reloads the page
        const order = event.order === 1 ? 1 : -1;
        if (event.field === this.sortField && order === this.sortOrder) {
            return;
        }
        this.sortField = event.field;
        this.sortOrder = order;
        this.pageIndex = 0;
        this.updateUrl();
        this.loadData();
    }

    public onToggleTechnical() {
        this.showTechnical = !this.showTechnical;
        this.columns = this.getColumns();
    }

    //#region Selection

    public canDecide(row: any): boolean {
        return this.isLocalUser &&
            row.type === PolicyActionType.REQUEST &&
            !!row.loaded &&
            row.status === PolicyActionStatus.NEW;
    }

    public isSelected(row: any): boolean {
        return this.selected.has(row.startMessageId);
    }

    public onSelect(row: any, checked: boolean) {
        if (checked) {
            this.selected.add(row.startMessageId);
        } else {
            this.selected.delete(row.startMessageId);
        }
    }

    public get selectableRows(): any[] {
        return (this.page || []).filter((row) => this.canDecide(row));
    }

    public get selectedRows(): any[] {
        return this.selectableRows.filter((row) => this.isSelected(row));
    }

    public get allSelected(): boolean {
        const rows = this.selectableRows;
        return rows.length > 0 && rows.every((row) => this.isSelected(row));
    }

    public onSelectAll(checked: boolean) {
        for (const row of this.selectableRows) {
            this.onSelect(row, checked);
        }
    }

    private pruneSelection() {
        const ids = new Set(this.selectableRows.map((row) => row.startMessageId));
        for (const id of Array.from(this.selected)) {
            if (!ids.has(id)) {
                this.selected.delete(id);
            }
        }
    }

    //#endregion

    //#region Single row actions

    private describe(row: any): string[] {
        return [
            `Policy: ${row.policyName || row.policyId || 'Unknown'}`,
            `Operation: ${this.getOperationName(row)}`,
            `Request: ${row.messageId}`
        ];
    }

    private confirm(header: string, text: string, details: string[], buttons: { name: string, class: string }[], document?: any) {
        return this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: document ? '720px' : '640px',
            styleClass: 'guardian-dialog',
            data: { header, text, details, document, buttons },
        })!;
    }

    public onApprove(item: any) {
        this.loading = true;
        this.externalPoliciesService
            .getRequestDocument({ startMessageId: item.startMessageId })
            .subscribe((response) => {
                this.loading = false;
                const dialogRef = this.confirm(
                    'Approve request',
                    'The request will be signed and executed on your behalf. Review the document before approving.',
                    this.describe(item),
                    [{ name: 'Close', class: 'secondary' }, { name: 'Approve', class: 'primary' }],
                    response?.body?.document || response?.body || {}
                );
                dialogRef.onClose.subscribe((result: string) => {
                    if (result === 'Approve') {
                        this.loading = true;
                        this.externalPoliciesService
                            .approveAction(item.messageId)
                            .subscribe(() => {
                                this.loadData();
                            }, (e) => {
                                this.loading = false;
                            });
                    }
                });
            }, (e) => {
                this.loading = false;
            });
    }

    public onReject(item: any) {
        const dialogRef = this.confirm(
            'Reject request',
            'The request will be rejected and the sender will be notified.',
            this.describe(item),
            [{ name: 'Close', class: 'secondary' }, { name: 'Reject', class: 'delete' }]
        );
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Reject') {
                this.loading = true;
                this.externalPoliciesService
                    .rejectAction(item.messageId)
                    .subscribe(() => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onCancel(item: any) {
        const dialogRef = this.confirm(
            'Cancel request',
            'The pending action will be canceled and will not be sent to the remote policy.',
            this.describe(item),
            [{ name: 'Close', class: 'secondary' }, { name: 'Cancel request', class: 'delete' }]
        );
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Cancel request') {
                this.loading = true;
                this.externalPoliciesService
                    .cancelAction(item.messageId)
                    .subscribe(() => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onReload(item: any) {
        this.loading = true;
        this.externalPoliciesService
            .reloadAction(item.messageId)
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    //#endregion

    //#region Bulk actions

    public onBulk(kind: BulkKind) {
        const rows = this.selectedRows;
        if (!rows.length || this.bulk?.running) {
            return;
        }
        const approve = kind === 'approve';
        const dialogRef = this.confirm(
            approve ? 'Approve selected requests' : 'Reject selected requests',
            approve
                ? `${rows.length} request(s) will be signed and executed on your behalf, one after another.`
                : `${rows.length} request(s) will be rejected, one after another.`,
            rows.map((row, i) => `${i + 1}. ${this.describeShort(row)}`),
            [
                { name: 'Close', class: 'secondary' },
                approve ? { name: 'Approve all', class: 'primary' } : { name: 'Reject all', class: 'delete' }
            ]
        );
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Approve all' || result === 'Reject all') {
                this.runBulk(kind, rows);
            }
        });
    }

    private describeShort(row: any): string {
        return `${row.policyName || row.policyId || 'Unknown'} – ${this.getOperationName(row)} (${row.messageId})`;
    }

    private async runBulk(kind: BulkKind, rows: any[]) {
        const approve = kind === 'approve';
        const progress: IBulkProgress = {
            label: approve ? 'Approving' : 'Rejecting',
            total: rows.length,
            done: 0,
            running: true,
            failures: []
        };
        this.bulk = progress;
        for (const row of rows) {
            try {
                await firstValueFrom(approve
                    ? this.externalPoliciesService.approveAction(row.messageId, true)
                    : this.externalPoliciesService.rejectAction(row.messageId, true));
            } catch (error) {
                progress.failures.push({
                    name: this.describeShort(row),
                    message: this.getErrorMessage(error)
                });
            }
            progress.done++;
        }
        progress.running = false;
        this.selected.clear();
        const succeeded = progress.total - progress.failures.length;
        if (progress.failures.length) {
            this.toastService.error(
                `${succeeded} of ${progress.total} request(s) processed, ${progress.failures.length} failed.`,
                approve ? 'Approve selected' : 'Reject selected'
            );
        } else {
            this.toastService.success(
                `${succeeded} request(s) ${approve ? 'approved' : 'rejected'}.`
            );
            this.bulk = null;
        }
        this.loadData();
    }

    public onDismissBulk() {
        this.bulk = null;
    }

    private getErrorMessage(error: any): string {
        const message = error?.error?.message || error?.message || 'Unknown error';
        return typeof message === 'string' ? message : JSON.stringify(message);
    }

    //#endregion

    getStatusName(row: any) {
        switch (row.status) {
            case PolicyActionStatus.NEW:
                return 'New';
            case PolicyActionStatus.COMPLETED:
                return 'Completed';
            case PolicyActionStatus.REJECTED:
                return 'Rejected';
            case PolicyActionStatus.ERROR:
                return 'Error';
            case PolicyActionStatus.CANCELED:
                return 'Canceled';
            default:
                return 'Incorrect status';
        }
    }

    getTypeName(row: any) {
        switch (row.type) {
            case PolicyActionType.ACTION:
                return 'Action';
            case PolicyActionType.REMOTE_ACTION:
                return 'Action';
            case PolicyActionType.REQUEST:
                return 'Request';
            default:
                return 'Incorrect type';
        }
    }

    getOperationName(row: any) {
        if (row.type === PolicyActionType.REQUEST) {
            const type = row.documentType || row.document?.type;
            switch (type) {
                case 'sign-and-send-role':
                    return 'Select role';
                case 'generate-did':
                    return 'Generate DID Document';
                case 'sign-vc':
                    return 'Sign VC Document';
                case 'send-message':
                    return 'Send message';
                case 'send-messages':
                    return 'Send messages';
                case 'create-topic':
                    return 'Create topic';
                case 'associate-token':
                    return 'Associate token';
                case 'dissociate-token':
                    return 'Dissociate token';
                default:
                    return type || 'Request';
            }
        }
        if (row.type === PolicyActionType.REMOTE_ACTION) {
            return 'Remote action';
        }
        if (row.blockTag) {
            return `Block action: ${row.blockTag}`;
        }
        return 'Block action';
    }

    public openVCDocument(row: any) {
        this.loading = true;
        this.externalPoliciesService
            .getRequestDocument({ startMessageId: row.startMessageId })
            .subscribe((response) => {
                this.dialogService.open(VCViewerDialog, {
                    showHeader: false,
                    width: '90%',
                    styleClass: 'guardian-dialog',
                    data: {
                        row: null,
                        document: response?.body?.document || response?.body,
                        title: 'Document',
                        type: 'JSON',
                    }
                });
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }
}
