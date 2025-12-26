import {
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject, Subscription } from 'rxjs';
import {catchError, debounceTime, finalize} from 'rxjs/operators';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import {DialogService, DynamicDialogRef} from "primeng/dynamicdialog";
import {ConfirmDialog} from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';

export type WriterOperation = 'AddTopic' | 'CreateTopic' | 'Delete' | 'Update';

export type GlobalDocumentType = 'vc' | 'json' | 'csv' | 'text' | 'any';

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

    showNextButton?: boolean;
    defaultTopicIds?: string[];
    documentTypeOptions?: Array<{ label: string; value: GlobalDocumentType }>;
}

export interface DocumentTypeOption {
    label: string;
    value: GlobalDocumentType;
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

    public documentTypeOptions: Array<{ label: string; value: GlobalDocumentType }> = [];

    public addTopicModalOpen: boolean = false;
    public addTopicModalTopicId: string = '';
    public addTopicModalError: string = '';

    private socket: any;

    private readonly updateChanges$ = new Subject<void>();
    private readonly subscriptions = new Subscription();

    public defaultTopicIds: string[] = [];

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

        if (this.confirmDialogRef) {
            this.confirmDialogRef.close();
            this.confirmDialogRef = null;
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

        this.showNextButton = Boolean(data?.showNextButton);
        this.documentTypeOptions = data?.documentTypeOptions || [];

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
        if (!value) {
            return;
        }

        row.documentType = value;
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

    public confirmAddTopicModal(topicId: string): void {
        const trimmedTopicId = String(topicId || '').trim();

        if (!trimmedTopicId) {
            this.addTopicModalError = 'Topic ID is required';
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.addTopicModalError = '';
        this.loading = true;

        const payload = {
            operation: 'AddTopic' as WriterOperation,
            streams: [
                {
                    topicId: trimmedTopicId,
                    active: false,
                },
            ],
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
                () => {
                    this.addTopicModalOpen = false;
                    this.loadData();
                },
                (e) => {
                    console.error(e?.error);
                    this.addTopicModalError = 'Failed to add topic';
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

    public trackByTopicId(_index: number, row: any): string {
        return String(row?.topicId || row?.globalTopicId || _index);
    }

    public openCreateTopicModal(): void {
        if (this.loading) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        if (this.confirmDialogRef) {
            this.confirmDialogRef.close();
            this.confirmDialogRef = null;
        }

        this.confirmDialogRef = this.dialogService.open(ConfirmDialog, {
            styleClass: 'confirm-dialog',
            closable: false,
            dismissableMask: true,
            showHeader: false,
            data: {
                title: 'Create Topic',
                description: 'Create a new global event topic?',
                submitButton: 'Create',
                cancelButton: 'Cancel',
            },
        });

        this.confirmDialogRef.onClose.subscribe((ok: boolean | null) => {
            this.confirmDialogRef = null;

            if (ok !== true) {
                return;
            }

            this.confirmCreateTopic();
        });
    }

    private confirmCreateTopic(): void {
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
                    this.loadData();
                },
                (e) => {
                    console.error(e?.error || e);
                    this.loading = false;
                    this.changeDetector.detectChanges();
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
            operation: 'Next' as any,
            streams: [],
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
