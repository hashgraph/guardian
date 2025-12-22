import {
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

export type GlobalDocumentType = 'vc' | 'json' | 'csv' | 'text' | 'any';
export type WriterOperation = 'AddTopic' | 'CreateTopic' | 'Delete' | 'Update';

export interface WriterStreamRow {
    topicId: string;
    documentType: GlobalDocumentType;
    active: boolean;
}

export interface WriterGetDataResponse {
    streams: Array<{
        globalTopicId: string;
        documentType: GlobalDocumentType;
        active: boolean;
    }>;

    defaultTopicIds?: string[];
}

@Component({
    selector: 'global-events-writer-block',
    templateUrl: './global-events-writer-block.component.html',
    styleUrls: ['./global-events-writer-block.component.scss'],
})
export class GlobalEventsWriterBlockComponent implements OnInit, OnDestroy {
    @Input('id')
    public id!: string;

    @Input('policyId')
    public policyId!: string;

    @Input('static')
    public static: any;

    public loading: boolean = true;

    public streams: WriterStreamRow[] = [];

    public readonly documentTypeOptions: Array<{ label: string; value: GlobalDocumentType }> = [
        { label: 'vc', value: 'vc' },
        { label: 'json', value: 'json' },
        { label: 'csv', value: 'csv' },
        { label: 'text', value: 'text' },
        { label: 'any', value: 'any' },
    ];

    // Modal: Add Topic
    public addTopicModalOpen: boolean = false;
    public addTopicModalTopicId: string = '';
    public addTopicModalError: string = '';

    // Modal: Create Topic confirm
    public createTopicModalOpen: boolean = false;

    private socket: any;

    private readonly updateChanges$ = new Subject<void>();
    private readonly subscriptions = new Subscription();

    public defaultTopicIds: string[] = [];

    constructor(
        private readonly policyEngineService: PolicyEngineService,
        private readonly wsService: WebSocketService,
        private readonly changeDetector: ChangeDetectorRef,
    ) {
    }

    public ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));

            this.subscriptions.add(
                this.updateChanges$
                    .pipe(debounceTime(300))
                    .subscribe(() => {
                        this.saveUpdateDraft();
                    }),
            );
        }

        this.loadData();
    }

    public ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }

        this.subscriptions.unsubscribe();
    }

    private onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    private loadData(): void {
        this.loading = true;

        if (this.static) {
            this.applyData(this.static as WriterGetDataResponse | null);
            this.loading = false;
            this.changeDetector.detectChanges();
            return;
        }

        (this.policyEngineService.getBlockData(this.id, this.policyId) as Observable<WriterGetDataResponse | null>)
            .pipe(
                catchError((e: HttpErrorResponse) => {
                    if (e.status === 503) {
                        return of(null);
                    }

                    console.error(e.error);
                    return of(null);
                }),
            )
            .subscribe((data: WriterGetDataResponse | null) => {
                this.applyData(data);
                this.loading = false;
                this.changeDetector.detectChanges();
            });
    }

    private applyData(data: WriterGetDataResponse | null): void {
        this.defaultTopicIds = (data?.defaultTopicIds || []).map((t) => String(t).trim());

        this.streams = (data?.streams || []).map((s) => {
            return {
                topicId: String(s.globalTopicId),
                documentType: (s.documentType) as GlobalDocumentType,
                active: Boolean(s.active),
            };
        });
    }

    // -----------------------------
    // Update (debounced)
    // -----------------------------

    private markUpdateChanged(): void {
        if (this.static) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.updateChanges$.next();
    }

    private saveUpdateDraft(): void {
        if (!this.policyId || !this.id) {
            return;
        }

        const payload = {
            operation: 'Update' as WriterOperation,
            streams: this.normalizeStreamsForUpdate(),
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e.error);
                },
            );
    }

    private normalizeStreamsForUpdate(): WriterStreamRow[] {
        return this.streams
            .map((s) => {
                return {
                    topicId: (s?.topicId || '').trim(),
                    documentType: (s?.documentType || 'any') as GlobalDocumentType,
                    active: Boolean(s?.active),
                };
            })
            .filter((s) => s.topicId.length > 0);
    }

    public onStreamDocumentTypeChange(row: WriterStreamRow, value: GlobalDocumentType | null): void {
        row.documentType = (value || 'any') as GlobalDocumentType;
        this.markUpdateChanged();
    }

    public onActiveCheckboxChange(row: WriterStreamRow, event: Event): void {
        const input = event.target as HTMLInputElement | null;

        row.active = Boolean(input?.checked);

        this.markUpdateChanged();
    }

    // -----------------------------
    // Add Topic (modal)
    // -----------------------------

    public openAddTopicModal(): void {
        if (this.static) {
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
        if (this.static) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        const topicId = (this.addTopicModalTopicId || '').trim();
        if (!topicId) {
            this.addTopicModalError = 'Topic ID is required';
            return;
        }

        this.loading = true;

        const payload = {
            operation: 'AddTopic' as WriterOperation,
            streams: [
                {
                    topicId,
                    documentType: 'any' as GlobalDocumentType,
                    active: false,
                },
            ],
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {
                    this.addTopicModalOpen = false;
                    this.loadData();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                    this.changeDetector.detectChanges();
                },
            );
    }

    // -----------------------------
    // Create Topic (confirm modal)
    // -----------------------------

    public openCreateTopicModal(): void {
        if (this.static) {
            return;
        }

        this.createTopicModalOpen = true;
    }

    public closeCreateTopicModal(): void {
        this.createTopicModalOpen = false;
    }

    public confirmCreateTopic(): void {
        if (this.static) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.loading = true;

        const payload = {
            operation: 'CreateTopic' as WriterOperation,
            streams: [],
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {
                    this.createTopicModalOpen = false;
                    this.loadData();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                    this.changeDetector.detectChanges();
                },
            );
    }

    // -----------------------------
    // Delete
    // -----------------------------

    public deleteStream(row: WriterStreamRow): void {
        if (this.static) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        const topicId = (row?.topicId || '').trim();
        if (!topicId) {
            return;
        }

        this.loading = true;

        const payload = {
            operation: 'Delete' as WriterOperation,
            streams: [{ topicId }],
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {
                    this.loadData();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                    this.changeDetector.detectChanges();
                },
            );
    }

    public isDefaultTopic(topicId: string): boolean {
        const normalized = (topicId || '').trim();
        return this.defaultTopicIds.includes(normalized);
    }
}
