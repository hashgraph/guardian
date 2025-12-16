import {
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GlobalEventsReaderFiltersDialogComponent } from '../../dialogs/global-events-reader-filters-dialog/global-events-reader-filters-dialog.component'

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

    /**
     * Persisted filters:
     * branchEvent -> (fieldLabel -> expectedValue)
     */
    filterFieldsByBranch?: Record<string, Record<string, string>>;

    /**
     * Front-only (until backend stores it):
     * branchEvent -> documentType
     */
    branchDocumentTypeByBranch?: Record<string, DocumentType>;
}

export interface GlobalEventsReaderGetDataResponse {
    readonly: boolean;
    config: ReaderConfig;
    streams: GlobalEventsStreamRow[];
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

    private socket: any;
    private initialTopicIds: string[] = [];
    private filtersDialogRef: DynamicDialogRef | null = null;

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
            )
            .subscribe((data: GlobalEventsReaderGetDataResponse | null) => {
                this.applyData(data);
                this.loading = false;
                this.changeDetector.detectChanges();
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
            this.initialTopicIds = [];
            return;
        }

        this.readonly = !!data.readonly;
        this.config = data.config || {
            eventTopics: [],
            documentType: 'any',
            branches: [],
        };

        const streams = Array.isArray(data.streams) ? data.streams : [];

        this.rows = streams.map((s) => {
            const row: GlobalEventsStreamRow = {
                globalTopicId: s.globalTopicId || '',
                active: !!s.active,
                status: s.status || 'FREE',
                lastMessageCursor: s.lastMessageCursor || '',
                isDefault: !!s.isDefault,
                filterFieldsByBranch: s.filterFieldsByBranch || {},
                branchDocumentTypeByBranch: this.buildDefaultBranchTypesMap(),
            };

            return row;
        });

        this.initialTopicIds = this.rows
            .map((r) => (r.globalTopicId || '').trim())
            .filter((v) => v.length > 0);
    }

    private normalizeTopicId(value: unknown): string {
        return String(value ?? '').trim();
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
        if (value === 'vc') {
            return 'vc';
        }
        if (value === 'json') {
            return 'json';
        }
        if (value === 'csv') {
            return 'csv';
        }
        if (value === 'text') {
            return 'text';
        }
        return 'any';
    }

    public addRow(): void {
        if (this.readonly) {
            return;
        }

        this.rows = [
            ...this.rows,
            {
                globalTopicId: '',
                active: true,
                status: 'FREE',
                lastMessageCursor: '',
                isDefault: false,
                filterFieldsByBranch: {},
                branchDocumentTypeByBranch: this.buildDefaultBranchTypesMap(),
            },
        ];
    }

    public removeRow(index: number): void {
        if (this.readonly) {
            return;
        }

        if (index < 0 || index >= this.rows.length) {
            return;
        }

        const copy = [...this.rows];
        copy.splice(index, 1);
        this.rows = copy;
    }

    public openFilters(row: GlobalEventsStreamRow): void {
        if (!row) {
            return;
        }

        const branches = Array.isArray(this.config?.branches) ? this.config.branches : [];
        const branchDocumentTypeByBranch = row.branchDocumentTypeByBranch
            ? { ...row.branchDocumentTypeByBranch }
            : this.buildDefaultBranchTypesMap();

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

        this.filtersDialogRef.onClose.subscribe((result: FiltersDialogResult | null) => {
            if (!result) {
                return;
            }

            row.filterFieldsByBranch = result.filterFieldsByBranch || {};
            row.branchDocumentTypeByBranch = result.branchDocumentTypeByBranch || {};

            this.changeDetector.detectChanges();
        });
    }

    public createTopic(): void {
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
                value: {},
            })
            .subscribe(
                () => {
                    this.loadData();
                },
                (e) => {
                    // eslint-disable-next-line no-console
                    console.error(e.error);
                    this.loading = false;
                    this.changeDetector.detectChanges();
                },
            );
    }

    private hasAnyFilters(filterFieldsByBranch: Record<string, Record<string, string>>): boolean {
        const branchKeys = Object.keys(filterFieldsByBranch || {});
        for (const branch of branchKeys) {
            if (Object.keys(filterFieldsByBranch[branch] || {}).length > 0) {
                return true;
            }
        }
        return false;
    }

    private buildStreamsPayload(): Array<{
        globalTopicId: string;
        active: boolean;
        filterFieldsByBranch: Record<string, Record<string, string>>;
    }> {
        const result: Array<{
            globalTopicId: string;
            active: boolean;
            filterFieldsByBranch: Record<string, Record<string, string>>;
        }> = [];

        for (const row of this.rows || []) {
            const topicId = this.normalizeTopicId(row.globalTopicId);
            if (!topicId) {
                continue;
            }

            const filterFieldsByBranch = row.filterFieldsByBranch || {};

            result.push({
                globalTopicId: topicId,
                active: !!row.active,
                filterFieldsByBranch,
            });
        }

        return result;
    }

    public save(): void {
        if (this.readonly) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        const streams = this.buildStreamsPayload();

        const currentTopicIds: string[] = streams
            .map((s) => this.normalizeTopicId(s.globalTopicId))
            .filter((t) => t.length > 0);

        const initialTopicIds: string[] = Array.isArray(this.initialTopicIds)
            ? this.initialTopicIds
            : [];

        const removedTopicIds: string[] = initialTopicIds.filter((t: string) => {
            return !currentTopicIds.includes(t);
        });

        const deleteStreams = removedTopicIds.map((t) => {
            return {
                globalTopicId: t,
                active: false,
                filterFieldsByBranch: {},
            };
        });

        const createStreams = streams.filter((s) => {
            if (s.active) {
                return true;
            }
            return this.hasAnyFilters(s.filterFieldsByBranch);
        });

        const delete$ = deleteStreams.length > 0
            ? this.policyEngineService.setBlockData(this.id, this.policyId, {
                operation: 'Delete',
                value: { streams: deleteStreams },
            })
            : of(null);

        const create$ = createStreams.length > 0
            ? this.policyEngineService.setBlockData(this.id, this.policyId, {
                operation: 'Create',
                value: { streams: createStreams },
            })
            : of(null);

        const update$ = streams.length > 0
            ? this.policyEngineService.setBlockData(this.id, this.policyId, {
                operation: 'Update',
                value: { streams },
            })
            : of(null);

        this.loading = true;

        delete$
            .pipe(
                switchMap(() => {
                    return create$;
                }),
                switchMap(() => {
                    return update$;
                }),
                catchError((e: any) => {
                    // eslint-disable-next-line no-console
                    console.error(e?.error || e);
                    return of(null);
                }),
                finalize(() => {
                    this.loading = false;
                    this.changeDetector.detectChanges();
                }),
            )
            .subscribe(() => {
                this.loadData();
            });
    }
}
