import {
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {Subject, Subscription, of, Observable} from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

export interface WriterTopicEntry {
    topicId: string;
}

export interface WriterGetDataResponse {
    topicIds: WriterTopicEntry[];
    documentType: string | null;
}

type WriterOperation = 'Update' | 'Submit';

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

    public topicIds: WriterTopicEntry[] = [];
    public documentType: string = 'any';

    public readonly documentTypeOptions: Array<{ label: string; value: string }> = [
        { label: 'vc', value: 'vc' },
        { label: 'json', value: 'json' },
        { label: 'csv', value: 'csv' },
        { label: 'text', value: 'text' },
        { label: 'any', value: 'any' },
    ];

    public loading: boolean = true;

    private socket: any;

    private readonly draftChanges$ = new Subject<void>();
    private readonly subscriptions = new Subscription();

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
                this.draftChanges$
                    .pipe(
                        debounceTime(300),
                    )
                    .subscribe(() => {
                        this.saveDraft();
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
        if (!data) {
            this.topicIds = [];
            this.documentType = 'any';
            return;
        }

        this.documentType = data.documentType || 'any';

        const topicIds = Array.isArray(data.topicIds) ? data.topicIds : [];
        this.topicIds = topicIds.map((t) => {
            return {
                topicId: t?.topicId ? String(t.topicId) : '',
            };
        });
    }

    private markDraftChanged(): void {
        if (this.static) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.draftChanges$.next();
    }

    private buildPayload(operation: WriterOperation): any {
        return {
            operation,
            value: {
                topicIds: this.normalizeTopicIds(),
                documentType: this.documentType || 'any',
            },
        };
    }

    private saveDraft(): void {
        const payload = this.buildPayload('Update');

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e.error);
                },
            );
    }

    private normalizeTopicIds(): Array<{ topicId: string }> {
        return this.topicIds
            .map((r) => {
                return {
                    topicId: (r?.topicId || '').trim(),
                };
            })
            .filter((r) => r.topicId.length > 0);
    }

    public addRow(): void {
        this.topicIds = [
            ...this.topicIds,
            { topicId: '' },
        ];

        this.markDraftChanged();
    }

    public removeRow(index: number): void {
        if (index < 0 || index >= this.topicIds.length) {
            return;
        }

        const copy = [...this.topicIds];
        copy.splice(index, 1);
        this.topicIds = copy;

        this.markDraftChanged();
    }

    public onDocumentTypeChange(value: string | null): void {
        this.documentType = value || 'any';
        this.markDraftChanged();
    }

    public onTopicIdChange(): void {
        this.markDraftChanged();
    }

    public submit(): void {
        if (this.static) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        if (!this.canPublish) {
            return;
        }

        this.loading = true;

        const payload = this.buildPayload('Submit');

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {
                    this.loading = false;
                    this.changeDetector.detectChanges();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                    this.changeDetector.detectChanges();
                },
            );
    }

    public get canPublish(): boolean {
        if (this.loading) {
            return false;
        }

        return this.normalizeTopicIds().length > 0;
    }

    public createTopic(): void {
        if (this.static) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.loading = true;

        const payload = {
            operation: 'CreateTopic',
            value: {
                topicIds: this.normalizeTopicIds(),
                documentType: this.documentType || 'any',
            },
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
}
