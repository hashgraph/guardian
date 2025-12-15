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

type StreamStatus = 'FREE' | 'PROCESSING' | 'ERROR' | string;

export interface BranchConfig {
    branchEvent: string;
    schema?: string | null;
}

export interface ReaderConfig {
    eventTopics: Array<{ topicId: string }>;
    documentType: string;
    branches: BranchConfig[];
}

export interface UiFilterItem {
    key: string;
    value: string;
}

export interface UiBranchFilters {
    branchEvent: string;
    items: UiFilterItem[];
}

export interface GlobalEventsStreamRow {
    globalTopicId: string;
    active: boolean;
    status: StreamStatus;
    lastMessageCursor: string;
    isDefault?: boolean;
    filterFieldsByBranch?: Record<string, Record<string, string>>;

    expanded?: boolean;
    branchFilters?: UiBranchFilters[];
}

export interface GlobalEventsReaderGetDataResponse {
    readonly: boolean;
    config: ReaderConfig;
    streams: GlobalEventsStreamRow[];
}

@Component({
    selector: 'global-events-reader-block',
    templateUrl: './global-events-reader-block.component.html',
    styleUrls: ['./global-events-reader-block.component.scss'],
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

    constructor(
        private readonly policyEngineService: PolicyEngineService,
        private readonly wsService: WebSocketService,
        private readonly changeDetector: ChangeDetectorRef,
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
                expanded: false,
            };

            row.branchFilters = this.buildBranchFilters(row.filterFieldsByBranch || {});
            return row;
        });

        this.initialTopicIds = this.rows
            .map((r) => (r.globalTopicId || '').trim())
            .filter((v) => v.length > 0);
    }

    private buildBranchFilters(filterFieldsByBranch: Record<string, Record<string, string>>): UiBranchFilters[] {
        const branches = Array.isArray(this.config?.branches) ? this.config.branches : [];

        return branches
            .map((b) => {
                const branchEvent = (b?.branchEvent || '').trim();
                if (!branchEvent) {
                    return null;
                }

                const obj = filterFieldsByBranch[branchEvent] || {};
                const items: UiFilterItem[] = Object.keys(obj).map((k) => {
                    return {
                        key: String(k || ''),
                        value: String(obj[k] ?? ''),
                    };
                });

                return {
                    branchEvent,
                    items,
                } as UiBranchFilters;
            })
            .filter((x) => !!x) as UiBranchFilters[];
    }

    private normalizeTopicId(value: unknown): string {
        return String(value ?? '').trim();
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
                expanded: true,
                branchFilters: this.buildBranchFilters({}),
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

    public toggleRow(row: GlobalEventsStreamRow): void {
        row.expanded = !row.expanded;
    }

    public addFilter(row: GlobalEventsStreamRow, branchEvent: string): void {
        if (this.readonly) {
            return;
        }

        const target = (row.branchFilters || []).find((b) => b.branchEvent === branchEvent);
        if (!target) {
            return;
        }

        target.items = [
            ...target.items,
            { key: '', value: '' },
        ];
    }

    public removeFilter(row: GlobalEventsStreamRow, branchEvent: string, index: number): void {
        if (this.readonly) {
            return;
        }

        const target = (row.branchFilters || []).find((b) => b.branchEvent === branchEvent);
        if (!target) {
            return;
        }

        if (index < 0 || index >= target.items.length) {
            return;
        }

        const copy = [...target.items];
        copy.splice(index, 1);
        target.items = copy;
    }

    private buildFilterFieldsByBranch(row: GlobalEventsStreamRow): Record<string, Record<string, string>> {
        const result: Record<string, Record<string, string>> = {};
        const branches = Array.isArray(row.branchFilters) ? row.branchFilters : [];

        for (const b of branches) {
            const branchEvent = (b?.branchEvent || '').trim();
            if (!branchEvent) {
                continue;
            }

            const obj: Record<string, string> = {};

            for (const item of b.items || []) {
                const key = String(item?.key ?? '').trim();
                const value = String(item?.value ?? '').trim();

                if (!key) {
                    continue;
                }

                obj[key] = value;
            }

            if (Object.keys(obj).length > 0) {
                result[branchEvent] = obj;
            }
        }

        return result;
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

            const filterFieldsByBranch = this.buildFilterFieldsByBranch(row);

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
