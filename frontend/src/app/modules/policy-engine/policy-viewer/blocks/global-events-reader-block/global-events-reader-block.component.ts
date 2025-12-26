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
import { GlobalEventsReaderFiltersDialogComponent } from '../../dialogs/global-events-reader-filters-dialog/global-events-reader-filters-dialog.component';
import { CustomConfirmDialogComponent } from "src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component";

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

export interface FiltersDialogResult {
    filterFieldsByBranch: Record<string, Record<string, string>>;
    branchDocumentTypeByBranch: Record<string, DocumentType>;
}

export interface GlobalEventsReaderGetDataResponse {
    readonly: boolean;
    config: ReaderConfig;
    streams: GlobalEventsStreamRow[];
    defaultTopicIds?: string[];

    showNextButton?: boolean;
    documentTypeOptions?: Array<{ label: string; value: DocumentType }>;

    branchesWithSchemaName?: BranchConfig[];
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

    public addTopicModalOpen: boolean = false;
    public addTopicModalTopicId: string = '';
    public addTopicModalError: string = '';

    private socket: any;
    private filtersDialogRef: DynamicDialogRef | null = null;
    private filtersDialogCloseSub: Subscription | null = null;

    public documentTypeOptions: Array<{ label: string; value: DocumentType }> = [];

    public showNextButton: boolean = false;

    private confirmDialogRef: DynamicDialogRef | null = null;

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

        if (this.confirmDialogRef) {
            this.confirmDialogRef.close();
            this.confirmDialogRef = null;
        }
    }

    private onUpdate(blocks: string[]): void {
        if (this.readonly || this.loading) {
            return;
        }

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
        this.showNextButton = Boolean(data?.showNextButton);

        if (!data) {
            this.rows = [];
            this.readonly = true;
            this.config = {
                eventTopics: [],
                documentType: 'any',
                branches: [],
            };
            this.defaultTopicIds = [];
            this.documentTypeOptions = [];
            return;
        }

        if (Array.isArray((data as any).branchesWithSchemaName)) {
            this.config.branches = (data as any).branchesWithSchemaName;
        }

        this.readonly = !!data.readonly;
        this.config = data.config || {
            eventTopics: [],
            documentType: 'any',
            branches: [],
        };

        this.documentTypeOptions = Array.isArray(data.documentTypeOptions)
            ? data.documentTypeOptions
            : [];

        this.defaultTopicIds = (data.defaultTopicIds || [])
            .map((t) => this.normalizeTopicId(t))
            .filter((t) => t.length > 0);

        this.config.branches = data.branchesWithSchemaName ?? []

        const defaultSet = new Set<string>(this.defaultTopicIds);
        const streams = Array.isArray(data.streams) ? data.streams : [];

        this.rows = streams.map((s) => {
            const topicId = this.normalizeTopicId(s.globalTopicId);

            const row: GlobalEventsStreamRow = {
                globalTopicId: topicId,
                active: !!s.active,
                status: s.status || 'FREE',
                lastMessageCursor: s.lastMessageCursor || '',
                isDefault: !!s.isDefault || defaultSet.has(topicId),
                filterFieldsByBranch: s.filterFieldsByBranch || {},
                branchDocumentTypeByBranch: s.branchDocumentTypeByBranch as any,
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

    private setRowSaving(row: GlobalEventsStreamRow, saving: boolean): void {
        row.saving = saving;
        this.changeDetector.detectChanges();
    }

    // -----------------------------
    // Add Topic (modal)
    // -----------------------------

    public openAddTopicModal(): void {
        if (this.readonly || this.loading) {
            return;
        }

        this.addTopicModalTopicId = '';
        this.addTopicModalError = '';
        this.addTopicModalOpen = true;
    }

    public closeAddTopicModal(): void {
        this.addTopicModalOpen = false;
    }

    public confirmAddTopicModal(topicIdFromModal?: string): void {
        if (this.readonly || this.loading) {
            return;
        }

        const topicId = this.normalizeTopicId(topicIdFromModal ?? this.addTopicModalTopicId);

        if (!topicId) {
            this.addTopicModalError = 'Topic ID is required';
            this.changeDetector.detectChanges();
            return;
        }

        this.loading = true;

        const payload = {
            globalTopicId: topicId,
            active: false,
            filterFieldsByBranch: {},
        };

        let shouldReload: boolean = false;

        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                operation: 'AddTopic',
                value: { streams: [payload] },
            })
            .pipe(
                finalize(() => {
                    if (shouldReload) {
                        this.loadData();
                        return;
                    }

                    this.loading = false;
                    this.changeDetector.detectChanges();
                }),
            )
            .subscribe(
                () => {
                    shouldReload = true;
                    this.addTopicModalOpen = false;
                },
                (e) => {
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

        if (this.loading) {
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

        this.loading = true;
        this.setRowSaving(row, true);

        let shouldReload: boolean = false;

        this.policyEngineService.setBlockData(this.id, this.policyId, {
            operation: 'Delete',
            value: { streams: [{ globalTopicId: topicId }] },
        }).pipe(
            finalize(() => {
                this.setRowSaving(row, false);

                if (shouldReload) {
                    this.loadData();
                    return;
                }

                this.loading = false;
                this.changeDetector.detectChanges();
            }),
        ).subscribe(
            () => {
                shouldReload = true;
            },
            (e) => {
                console.error(e?.error || e);
            },
        );
    }


    // -----------------------------
    // Filters / Update
    // -----------------------------

    public onActiveChanged(row: GlobalEventsStreamRow, value: boolean): void {
        if (this.readonly || this.loading) {
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
        if (this.readonly || this.loading) {
            return;
        }

        if (!row) {
            return;
        }

        const branches = Array.isArray(this.config?.branches) ? this.config.branches : [];
        const branchDocumentTypeByBranch = row.branchDocumentTypeByBranch ?? {}

        if (this.filtersDialogCloseSub) {
            this.filtersDialogCloseSub.unsubscribe();
            this.filtersDialogCloseSub = null;
        }

        if (this.filtersDialogRef) {
            this.filtersDialogRef.close();
            this.filtersDialogRef = null;
        }

        this.filtersDialogRef = this.dialogService.open(GlobalEventsReaderFiltersDialogComponent, {
            showHeader: false,
            width: '720px',
            styleClass: 'global-events-reader-filters-dialog',
            data: {
                readonly: this.readonly,
                branches,
                documentTypes: this.documentTypeOptions,
                filterFieldsByBranch: row.filterFieldsByBranch || {},
                branchDocumentTypeByBranch,
            },
        });

        this.filtersDialogCloseSub = this.filtersDialogRef.onClose.subscribe((result: FiltersDialogResult | null) => {
            if (!result) {
                return;
            }

            row.filterFieldsByBranch = result.filterFieldsByBranch;
            row.branchDocumentTypeByBranch = result.branchDocumentTypeByBranch;

            this.changeDetector.detectChanges();
            this.updateRow(row);
        });
    }

    private updateRow(row: GlobalEventsStreamRow): void {
        if (!row) {
            return;
        }

        if (this.loading) {
            return;
        }

        if (row.saving) {
            return;
        }

        const topicId = this.normalizeTopicId(row.globalTopicId);
        if (!topicId) {
            return;
        }

        this.loading = true;
        this.setRowSaving(row, true);

        const payload = {
            globalTopicId: topicId,
            active: !!row.active,
            filterFieldsByBranch: row.filterFieldsByBranch,
            branchDocumentTypeByBranch: row.branchDocumentTypeByBranch,
        };

        let shouldReload: boolean = false;

        this.policyEngineService.setBlockData(this.id, this.policyId, {
            operation: 'Update',
            value: { streams: [payload] },
        }).pipe(
            finalize(() => {
                this.setRowSaving(row, false);

                if (shouldReload) {
                    this.loadData();
                    return;
                }

                this.loading = false;
                this.changeDetector.detectChanges();
            }),
        ).subscribe(
            () => {
                shouldReload = true;
            },
            (e) => {
                console.error(e?.error || e);
            },
        );
    }


    public formatLastUpdate(cursor: string): string {
        const raw = String(cursor || '').trim();
        if (!raw) {
            return '-';
        }

        const parts = raw.split('.');
        const seconds = Number(parts[0]);
        const nanosRaw = String(parts[1] || '0');

        const ms = Number(nanosRaw.padEnd(3, '0').slice(0, 3));
        const date = new Date((seconds * 1000) + ms);

        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date).replace(',', '');
    }

    public getFiltersCount(row: GlobalEventsStreamRow): number {
        const byBranch = row.filterFieldsByBranch;

        if (!byBranch) {
            return 0;
        }

        const branchKeys = Object.keys(byBranch);

        let total = 0;

        for (const branchEvent of branchKeys) {
            const filters = byBranch[branchEvent];
            const filterLabels = Object.keys(filters);

            for (const label of filterLabels) {
                const value = filters[label];

                if (String(label).trim() && String(value).trim()) {
                    total++;
                }
            }
        }

        return total;
    }

    public getFiltersLabel(row: GlobalEventsStreamRow): string {
        const count = this.getFiltersCount(row);

        if (count > 0) {
            return `Custom (${count})`;
        }

        return 'Default';
    }

    public openCreateTopicModal(): void {
        if (this.loading) {
            return;
        }

        if (this.readonly) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        if (this.confirmDialogRef) {
            this.confirmDialogRef.close();
            this.confirmDialogRef = null;
        }

        this.confirmDialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            closable: false,
            dismissableMask: true,
            styleClass: 'create-topic-custom-confirm-dialog',
            width: '520px',
            data: {
                header: 'Create Topic',
                text: 'Create a new global event topic?',
                buttons: [
                    {
                        name: 'Cancel',
                        class: 'secondary',
                    },
                    {
                        name: 'Create',
                        class: 'primary',
                    },
                ],
            },
        });

        this.confirmDialogRef.onClose.subscribe((action: string | null) => {
            this.confirmDialogRef = null;

            if (action !== 'Create') {
                return;
            }

            this.confirmCreateTopic();
        });
    }

    private confirmCreateTopic(): void {
        if (this.readonly || this.loading) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.loading = true;

        let shouldReload: boolean = false;

        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                operation: 'CreateTopic',
                value: { streams: [] },
            })
            .pipe(
                finalize(() => {
                    if (shouldReload) {
                        this.loadData();
                        return;
                    }

                    this.loading = false;
                    this.changeDetector.detectChanges();
                }),
            )
            .subscribe(
                () => {
                    shouldReload = true;
                },
                (e) => {
                    console.error(e?.error || e);
                },
            );
    }

    public onNext(): void {
        if (this.static) {
            return;
        }
        if (!this.policyId || !this.id) {
            return;
        }
        if (this.loading) {
            return;
        }

        this.loading = true;

        const payload = {
            operation: 'Next',
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .pipe(
                finalize(() => {
                    this.loading = false;
                    this.changeDetector.detectChanges();
                }),
            )
            .subscribe(
                () => {},
                (e) => {
                    console.error(e?.error || e);
                },
            );
    }
}
