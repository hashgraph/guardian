import {
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import {
    GlobalEventsReaderFiltersDialogComponent
} from '../../dialogs/global-events-reader-filters-dialog/global-events-reader-filters-dialog.component';

type StreamStatus = 'FREE' | 'PROCESSING' | 'ERROR' | string;
export type DocumentType = 'vc' | 'json' | 'csv' | 'text' | 'any';

export interface BranchConfig {
    branchEvent: string;
    documentType?: DocumentType | string | null;
    schema?: string | null;
    schemaName?: string | null;
}

export interface ReaderConfig {
    eventTopics: Array<{ topicId: string }>;
    documentType: DocumentType | string;
    branches: BranchConfig[];
}

export interface GlobalEventsStreamRow {
    globalTopicId: string;
    active: boolean;
    status: StreamStatus;
    lastMessageCursor: string;
    isDefault?: boolean;

    filterFieldsByBranch?: Record<string, Record<string, string>>;
    branchDocumentTypeByBranch?: Record<string, DocumentType>;

    /**
     * UI-only: row not saved yet (no DB stream)
     */
    isNew: boolean;

    /**
     * UI-only: in-flight flag for per-row save/update/delete
     */
    saving: boolean;
}

export interface GlobalEventsReaderGetDataResponse {
    readonly: boolean;
    config: ReaderConfig;
    streams: GlobalEventsStreamRow[];
    defaultTopicIds?: string[];
}

export interface FiltersDialogResult {
    filterFieldsByBranch: Record<string, Record<string, string>>;
    branchDocumentTypeByBranch: Record<string, DocumentType>;
}

@Component({
    selector: 'global-events-reader-block',
    templateUrl: './global-events-reader-block.component.html',
    styleUrls: ['./global-events-reader-block.component.scss'],
    providers: [DialogService],
})
export class GlobalEventsReaderBlockComponent implements OnInit, OnDestroy {
    @Input('id')
    public id!: string;

    @Input('policyId')
    public policyId!: string;

    @Input('static')
    public static: any;

    public rows: GlobalEventsStreamRow[] = [];
    public readonly: boolean = false;
    public loading: boolean = true;

    public config: ReaderConfig = {
        eventTopics: [],
        documentType: 'any',
        branches: [],
    };

    public defaultTopicIds: string[] = [];

    // Modal: Add Topic
    public addTopicModalOpen: boolean = false;
    public addTopicModalTopicId: string = '';
    public addTopicModalError: string = '';

    // Modal: Create Topic confirm
    public createTopicModalOpen: boolean = false;

    private socket: any;
    private filtersDialogRef: DynamicDialogRef | null = null;
    private filtersDialogCloseSub: Subscription | null = null;

    public readonly documentTypes: Array<{ label: string; value: DocumentType }> = [
        { label: 'VC', value: 'vc' },
        { label: 'JSON', value: 'json' },
        { label: 'CSV', value: 'csv' },
        { label: 'Text', value: 'text' },
        { label: 'Any', value: 'any' },
    ];

    constructor(
        private readonly policyEngineService: PolicyEngineService,
        private readonly wsService: WebSocketService,
        private readonly changeDetector: ChangeDetectorRef,
        private readonly dialogService: DialogService,
    ) {
    }

    public ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    public ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }

        if (this.filtersDialogCloseSub) {
            this.filtersDialogCloseSub.unsubscribe();
            this.filtersDialogCloseSub = null;
        }

        if (this.filtersDialogRef) {
            this.filtersDialogRef.close();
            this.filtersDialogRef = null;
        }
    }

    private onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    private loadData(): void {
        this.loading = true;

        if (this.static) {
            this.applyData(this.static as GlobalEventsReaderGetDataResponse | null);
            this.loading = false;
            this.changeDetector.detectChanges();
            return;
        }

        (this.policyEngineService.getBlockData(this.id, this.policyId) as Observable<GlobalEventsReaderGetDataResponse | null>)
            .pipe(
                catchError((e: HttpErrorResponse) => {
                    if (e.status === 503) {
                        return of(null);
                    }

                    // eslint-disable-next-line no-console
                    console.error(e.error);
                    return of(null);
                }),
                finalize(() => {
                    this.loading = false;
                    this.changeDetector.detectChanges();
                }),
            )
            .subscribe((data: GlobalEventsReaderGetDataResponse | null) => {
                this.applyData(data);
            });
    }

    private applyData(data: GlobalEventsReaderGetDataResponse | null): void {
        if (!data) {
            this.rows = [];
            this.readonly = true;
            this.config = {
                eventTopics: [],
                documentType: 'any',
                branches: [],
            };
            this.defaultTopicIds = [];
            return;
        }

        this.readonly = !!data.readonly;
        this.config = data.config || {
            eventTopics: [],
            documentType: 'any',
            branches: [],
        };

        this.defaultTopicIds = (data.defaultTopicIds || [])
            .map((t) => this.normalizeTopicId(t))
            .filter((t) => t.length > 0);

        const defaultSet = new Set<string>(this.defaultTopicIds);

        const streams = Array.isArray(data.streams) ? data.streams : [];

        this.rows = streams.map((s) => {
            const fallbackBranchTypes = this.buildDefaultBranchTypesMap();
            const serverBranchTypes = s.branchDocumentTypeByBranch || {};

            const topicId = this.normalizeTopicId(s.globalTopicId);

            const row: GlobalEventsStreamRow = {
                globalTopicId: topicId,
                active: !!s.active,
                status: s.status || 'FREE',
                lastMessageCursor: s.lastMessageCursor || '',
                isDefault: !!s.isDefault || defaultSet.has(topicId),
                filterFieldsByBranch: s.filterFieldsByBranch || {},
                branchDocumentTypeByBranch: Object.keys(serverBranchTypes).length > 0
                    ? (serverBranchTypes as any)
                    : fallbackBranchTypes,
                isNew: false,
                saving: false,
            };

            return row;
        });
    }

    private normalizeTopicId(value: unknown): string {
        return String(value ?? '').trim();
    }

    public isDefaultTopic(topicId: string): boolean {
        const normalized = this.normalizeTopicId(topicId);
        if (!normalized) {
            return false;
        }
        return this.defaultTopicIds.includes(normalized);
    }

    public hasDefaultTopics(): boolean {
        return this.rows.some((r) => !!r?.isDefault);
    }

    private buildDefaultBranchTypesMap(): Record<string, DocumentType> {
        const result: Record<string, DocumentType> = {};
        const branches = Array.isArray(this.config?.branches) ? this.config.branches : [];

        for (const branch of branches) {
            const branchEvent = String(branch?.branchEvent ?? '').trim();
            if (!branchEvent) {
                continue;
            }

            const cfgType = String(branch?.documentType ?? '').toLowerCase().trim();
            const normalized = this.normalizeDocumentType(cfgType);

            result[branchEvent] = normalized;
        }

        return result;
    }

    private normalizeDocumentType(value: string): DocumentType {
        const v = String(value ?? '').toLowerCase().trim();

        if (v === 'vc') {
            return 'vc';
        }
        if (v === 'json') {
            return 'json';
        }
        if (v === 'csv') {
            return 'csv';
        }
        if (v === 'text') {
            return 'text';
        }
        return 'any';
    }

    private setRowSaving(row: GlobalEventsStreamRow, saving: boolean): void {
        row.saving = saving;
        this.changeDetector.detectChanges();
    }

    // -----------------------------
    // Add Topic (modal)
    // -----------------------------

    public openAddTopicModal(): void {
        if (this.readonly) {
            return;
        }

        this.addTopicModalTopicId = '';
        this.addTopicModalError = '';
        this.addTopicModalOpen = true;
    }

    public closeAddTopicModal(): void {
        this.addTopicModalOpen = false;
    }

    public confirmAddTopicModal(): void {
        if (this.readonly) {
            return;
        }

        const topicId = this.normalizeTopicId(this.addTopicModalTopicId);
        if (!topicId) {
            this.addTopicModalError = 'Topic ID is required';
            return;
        }

        this.loading = true;

        const payload = {
            globalTopicId: topicId,
            active: false,
            filterFieldsByBranch: {},
            branchDocumentTypeByBranch: this.buildDefaultBranchTypesMap(),
        };

        this.policyEngineService.setBlockData(this.id, this.policyId, {
            operation: 'AddTopic',
            value: { streams: [payload] },
        }).pipe(
            finalize(() => {
                this.loading = false;
                this.changeDetector.detectChanges();
            }),
        ).subscribe(
            () => {
                this.addTopicModalOpen = false;
                this.loadData();
            },
            (e) => {
                // eslint-disable-next-line no-console
                console.error(e?.error || e);
            },
        );
    }

    // -----------------------------
    // Create Topic (confirm modal)
    // -----------------------------

    public openCreateTopicModal(): void {
        if (this.readonly) {
            return;
        }

        this.createTopicModalOpen = true;
    }

    public closeCreateTopicModal(): void {
        this.createTopicModalOpen = false;
    }

    public confirmCreateTopic(): void {
        if (this.readonly) {
            return;
        }
        if (!this.policyId || !this.id) {
            return;
        }

        this.loading = true;

        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                operation: 'CreateTopic',
                value: { streams: [] },
            })
            .pipe(
                finalize(() => {
                    this.loading = false;
                    this.changeDetector.detectChanges();
                }),
            )
            .subscribe(
                (res: any) => {
                    this.createTopicModalOpen = false;

                    const topicId = this.normalizeTopicId(res?.topicId);
                    if (!topicId) {
                        this.loadData();
                        return;
                    }

                    this.rows = [
                        {
                            globalTopicId: topicId,
                            active: false,
                            status: 'FREE',
                            lastMessageCursor: '',
                            isDefault: false,
                            filterFieldsByBranch: {},
                            branchDocumentTypeByBranch: this.buildDefaultBranchTypesMap(),
                            isNew: false,
                            saving: false,
                        },
                        ...this.rows,
                    ];

                    this.changeDetector.detectChanges();
                    this.loadData();
                },
                (e) => {
                    // eslint-disable-next-line no-console
                    console.error(e?.error || e);
                },
            );
    }

    // -----------------------------
    // Delete
    // -----------------------------

    public removeRow(index: number): void {
        if (this.readonly) {
            return;
        }
        if (index < 0 || index >= this.rows.length) {
            return;
        }

        const row = this.rows[index];
        if (!row) {
            return;
        }

        if (row.isNew) {
            const copy = [...this.rows];
            copy.splice(index, 1);
            this.rows = copy;
            return;
        }

        if (row.isDefault) {
            return;
        }

        const topicId = this.normalizeTopicId(row.globalTopicId);
        if (!topicId) {
            return;
        }

        this.setRowSaving(row, true);

        this.policyEngineService.setBlockData(this.id, this.policyId, {
            operation: 'Delete',
            value: { streams: [{ globalTopicId: topicId }] },
        }).pipe(
            finalize(() => {
                this.setRowSaving(row, false);
            }),
        ).subscribe(
            () => {
                this.loadData();
            },
            (e) => {
                // eslint-disable-next-line no-console
                console.error(e?.error || e);
            },
        );
    }

    // -----------------------------
    // Filters / Update
    // -----------------------------

    public onActiveChanged(row: GlobalEventsStreamRow, value: boolean): void {
        if (this.readonly) {
            return;
        }
        if (!row) {
            return;
        }
        if (row.saving) {
            return;
        }

        row.active = !!value;
        this.updateRow(row);
    }

    public openFilters(row: GlobalEventsStreamRow): void {
        if (!row) {
            return;
        }

        const branches = Array.isArray(this.config?.branches) ? this.config.branches : [];
        const branchDocumentTypeByBranch = row.branchDocumentTypeByBranch
            ? { ...row.branchDocumentTypeByBranch }
            : this.buildDefaultBranchTypesMap();

        if (this.filtersDialogCloseSub) {
            this.filtersDialogCloseSub.unsubscribe();
            this.filtersDialogCloseSub = null;
        }

        if (this.filtersDialogRef) {
            this.filtersDialogRef.close();
            this.filtersDialogRef = null;
        }

        this.filtersDialogRef = this.dialogService.open(GlobalEventsReaderFiltersDialogComponent, {
            header: `Edit filters for topic ${this.normalizeTopicId(row.globalTopicId) || '-'}`,
            width: '720px',
            styleClass: 'global-events-reader-filters-dialog',
            data: {
                readonly: this.readonly,
                branches,
                documentTypes: this.documentTypes,
                filterFieldsByBranch: row.filterFieldsByBranch || {},
                branchDocumentTypeByBranch,
            },
        });

        this.filtersDialogCloseSub = this.filtersDialogRef.onClose.subscribe((result: FiltersDialogResult | null) => {
            if (!result) {
                return;
            }

            row.filterFieldsByBranch = result.filterFieldsByBranch || {};
            row.branchDocumentTypeByBranch = result.branchDocumentTypeByBranch || {};

            this.changeDetector.detectChanges();
            this.updateRow(row);
        });
    }

    private updateRow(row: GlobalEventsStreamRow): void {
        if (!row) {
            return;
        }

        const topicId = this.normalizeTopicId(row.globalTopicId);
        if (!topicId) {
            return;
        }

        this.setRowSaving(row, true);

        const payload = {
            globalTopicId: topicId,
            active: !!row.active,
            filterFieldsByBranch: row.filterFieldsByBranch || {},
            branchDocumentTypeByBranch: row.branchDocumentTypeByBranch || this.buildDefaultBranchTypesMap(),
        };

        this.policyEngineService.setBlockData(this.id, this.policyId, {
            operation: 'Update',
            value: { streams: [payload] },
        }).pipe(
            finalize(() => {
                this.setRowSaving(row, false);
            }),
        ).subscribe(
            () => {
                this.loadData();
            },
            (e) => {
                // eslint-disable-next-line no-console
                console.error(e?.error || e);
            },
        );
    }
}
