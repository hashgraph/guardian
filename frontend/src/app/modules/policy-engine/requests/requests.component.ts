import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationType, PolicyActionStatus, PolicyActionType, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { debounceTime, firstValueFrom, forkJoin, Subject, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { ToastService } from 'src/app/services/toast.service';
import { getOperationInfo, getRequestKind, getStatusInfo, IOperationInfo, IStatusInfo, RequestKind, timeAgo } from './request-labels';
import { RequestDetailsAction, RequestDetailsDialog } from './request-details-dialog/request-details-dialog.component';
import { IConfirmButton, IConfirmRow, RequestConfirmDialog } from './request-confirm-dialog/request-confirm-dialog.component';

interface IBulkProgress {
    label: string;
    total: number;
    done: number;
    running: boolean;
    failures: { name: string, message: string }[];
}

interface IRequestItem {
    row: any;
    kind: RequestKind;
    operation: IOperationInfo;
    status: IStatusInfo;
    ago: string;
}

type BulkKind = 'approve' | 'reject';

type RequestTab = 'need' | 'progress' | 'failed' | 'all';

const DEFAULT_TAB: RequestTab = 'need';

/**
 * What every tab lists: the types and the statuses of the threads
 */
const TAB_FILTERS: { [tab in RequestTab]: { type?: string, status?: string } } = {
    need: { type: PolicyActionType.REQUEST, status: PolicyActionStatus.NEW },
    progress: { type: `${PolicyActionType.ACTION},${PolicyActionType.REMOTE_ACTION}`, status: PolicyActionStatus.NEW },
    failed: { status: PolicyActionStatus.ERROR },
    all: {}
};

@Component({
    selector: 'app-policy-requests',
    templateUrl: './requests.component.html',
    styleUrls: [
        '../styles/top-toolbar.scss',
        './request-common.scss',
        './requests.component.scss'
    ],
    providers: [DatePipe],
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
    public items: IRequestItem[] = [];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;

    public readonly tabs: { id: RequestTab, label: string }[] = [
        { id: 'need', label: 'Needs your approval' },
        { id: 'progress', label: 'In progress' },
        { id: 'failed', label: 'Failed' },
        { id: 'all', label: 'All' }
    ];
    public tab: RequestTab = DEFAULT_TAB;
    public counts: { [tab in RequestTab]: number } = { need: 0, progress: 0, failed: 0, all: 0 };

    public allPolicies: any[] = [];
    /**
     * The policy the page was opened for (`policyId` in the URL), it cannot be changed here
     */
    public scopedPolicyId: string = '';
    /**
     * The policy picked in the filter (`policy` in the URL)
     */
    public selectedPolicyId: string = '';
    public searchTerm: string = '';

    public selected = new Set<string>();
    public bulk: IBulkProgress | null = null;

    private subscription = new Subscription();
    private dataSubscription: Subscription | null = null;
    private profileLoaded: boolean = false;
    private searchRows: any[] = [];
    private readonly refresh = new Subject<void>();
    private readonly search = new Subject<void>();

    constructor(
        private profileService: ProfileService,
        private externalPoliciesService: ExternalPoliciesService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private toastService: ToastService,
        private router: Router,
        private route: ActivatedRoute,
        private wsService: WebSocketService,
        private datePipe: DatePipe
    ) {
    }

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                const scopedPolicyId = queryParams.policyId || '';
                const selectedPolicyId = scopedPolicyId ? '' : (queryParams.policy || '');
                const tab = this.tabs.find((t) => t.id === queryParams.tab)?.id || DEFAULT_TAB;

                const changed = scopedPolicyId !== this.scopedPolicyId ||
                    selectedPolicyId !== this.selectedPolicyId ||
                    tab !== this.tab;

                this.scopedPolicyId = scopedPolicyId;
                this.selectedPolicyId = selectedPolicyId;
                this.tab = tab;

                if (!this.profileLoaded) {
                    this.loadProfile();
                } else if (changed) {
                    this.pageIndex = 0;
                    this.selected.clear();
                    this.loadData();
                }
            })
        );
        this.subscription.add(
            this.wsService.requestSubscribe((message) => {
                const policyId = message?.data?.policyId;
                if (this.policyId && policyId && policyId !== this.policyId) {
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
        this.subscription.add(
            this.search.pipe(debounceTime(300)).subscribe(() => {
                this.pageIndex = 0;
                this.loadData();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.dataSubscription?.unsubscribe();
    }

    /**
     * The policy the list is limited to
     */
    public get policyId(): string {
        return this.scopedPolicyId || this.selectedPolicyId;
    }

    public get scopedPolicy(): any {
        return this.allPolicies.find((p: any) => p.id === this.scopedPolicyId) || null;
    }

    /**
     * Policies that are not remote are not in the filter, the rows still know the name
     */
    public get scopedPolicyName(): string {
        return this.scopedPolicy?.name || this.page?.[0]?.policyName || 'Policy';
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

            this.allPolicies = [...remotePolicies].filter((p) => p.status === PolicyStatus.VIEW);

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
        const filters: any = { ...TAB_FILTERS[this.tab] };
        if (!silent) {
            this.loading = true;
        }
        if (this.policyId) {
            filters.policyId = this.policyId;
        }
        filters.sortField = 'createDate';
        filters.sortDirection = 'desc';

        this.loadCounts();

        // the server cannot search, so a search reads every row of the tab and filters them here
        const searching = !!this.searchTerm.trim();
        this.dataSubscription?.unsubscribe();
        this.dataSubscription = this.externalPoliciesService
            .getActionRequests(
                searching ? 0 : this.pageIndex,
                searching ? 0 : this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.externalPoliciesService.parsePage(response);
                if (searching) {
                    this.searchRows = page;
                    this.showSearchPage();
                } else {
                    this.searchRows = [];
                    this.setPage(page, count);
                }
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }

    private loadCounts() {
        this.externalPoliciesService
            .getActionRequestsCount(this.policyId ? { policyId: this.policyId } : undefined)
            .subscribe((response) => {
                const body = response?.body;
                if (body) {
                    this.counts = {
                        need: body.requestsCount || 0,
                        progress: body.actionsCount || 0,
                        failed: body.failedCount || 0,
                        all: body.threadsCount || 0
                    };
                }
            });
    }

    private setPage(rows: any[], count: number) {
        this.page = rows;
        this.pageCount = count;
        this.items = rows.map((row) => ({
            row,
            kind: getRequestKind(row),
            operation: getOperationInfo(row),
            status: getStatusInfo(row),
            ago: timeAgo(row.createDate)
        }));
        this.pruneSelection();
    }

    private showSearchPage() {
        const term = this.searchTerm.trim().toLowerCase();
        const found = this.searchRows.filter((row) => {
            const operation = getOperationInfo(row);
            return [operation.title, operation.reason, row.policyName, getStatusInfo(row).label]
                .some((value) => String(value || '').toLowerCase().includes(term));
        });
        const start = this.pageIndex * this.pageSize;
        this.setPage(found.slice(start, start + this.pageSize), found.length);
    }

    private updateUrl() {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                tab: this.tab !== DEFAULT_TAB ? this.tab : null,
                policy: this.selectedPolicyId || null
            },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    public onBackToPolicies() {
        this.router.navigate(['/policy-viewer']);
    }

    public onBackToPolicy() {
        this.router.navigate(['/policy-viewer', this.scopedPolicyId]);
    }

    /**
     * Show the requests of every policy
     */
    public onClearScope() {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { policyId: null, policy: null },
            queryParamsHandling: 'merge'
        });
    }

    public onTab(tab: RequestTab) {
        if (tab === this.tab) {
            return;
        }
        this.tab = tab;
        this.pageIndex = 0;
        this.selected.clear();
        this.updateUrl();
        this.loadData();
    }

    public onPolicyFilter() {
        this.pageIndex = 0;
        this.updateUrl();
        this.loadData();
    }

    public onSearch() {
        this.search.next();
    }

    public onClearSearch() {
        this.searchTerm = '';
        this.pageIndex = 0;
        this.loadData();
    }

    public onPage(event: any): void {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        if (this.searchTerm.trim()) {
            this.showSearchPage();
        } else {
            this.loadData();
        }
    }

    public get policyOptions(): { id: string, name: string }[] {
        return [
            { id: '', name: 'All policies' },
            ...this.allPolicies.map((p) => ({ id: p.id, name: p.name }))
        ];
    }

    public get isEmpty(): boolean {
        return !this.loading && this.items.length === 0;
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

    private describe(row: any): IConfirmRow[] {
        return [
            { name: 'Policy', value: row.policyName || row.policyId || 'Unknown' },
            { name: 'Operation', value: getOperationInfo(row).title },
            { name: 'Created', value: this.datePipe.transform(row.createDate, 'dd MMM yyyy, HH:mm') || '' }
        ];
    }

    private confirm(
        header: string,
        text: string,
        buttons: IConfirmButton[],
        content: { rows?: IConfirmRow[], list?: string[], document?: any } = {}
    ) {
        return this.dialogService.open(RequestConfirmDialog, {
            showHeader: false,
            width: content.document ? '720px' : '560px',
            styleClass: 'guardian-dialog',
            data: { header, text, buttons, ...content },
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
                    [{ name: 'Close', class: 'secondary' }, { name: 'Approve', class: 'primary' }],
                    {
                        rows: this.describe(item),
                        document: response?.body?.document || response?.body || {}
                    }
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
            'The request will be rejected and the policy will be notified.',
            [{ name: 'Close', class: 'secondary' }, { name: 'Reject', class: 'delete' }],
            { rows: this.describe(item) }
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
            'The pending action will be cancelled and will not be sent to the remote policy.',
            [{ name: 'Close', class: 'secondary' }, { name: 'Cancel request', class: 'delete' }],
            { rows: this.describe(item) }
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
            [
                { name: 'Close', class: 'secondary' },
                approve ? { name: 'Approve all', class: 'primary' } : { name: 'Reject all', class: 'delete' }
            ],
            { list: rows.map((row) => this.describeShort(row)) }
        );
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Approve all' || result === 'Reject all') {
                this.runBulk(kind, rows);
            }
        });
    }

    private describeShort(row: any): string {
        return `${row.policyName || row.policyId || 'Unknown'} – ${getOperationInfo(row).title}`;
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

    public onDetails(row: any) {
        const dialogRef = this.dialogService.open(RequestDetailsDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                row,
                canDecide: this.canDecide(row),
                isLocalUser: this.isLocalUser
            }
        })!;
        dialogRef.onClose.subscribe((action: RequestDetailsAction | null) => {
            switch (action) {
                case 'approve':
                    this.onApprove(row);
                    break;
                case 'reject':
                    this.onReject(row);
                    break;
                case 'cancel':
                    this.onCancel(row);
                    break;
                case 'reload':
                    this.onReload(row);
                    break;
                default:
                    break;
            }
        });
    }
}
