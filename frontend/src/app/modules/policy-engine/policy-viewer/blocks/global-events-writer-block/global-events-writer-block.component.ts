import {
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';

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
    userId: string,
    userDid: string,
    readonly: boolean;
}

@Component({
    selector: 'global-events-writer-block',
    templateUrl: './global-events-writer-block.component.html',
    styleUrls: ['./global-events-writer-block.component.scss'],
    providers: [DialogService],
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

    public defaultTopicIds: string[] = [];
    public showNextButton: boolean = false;

    private socket: any;

    private confirmDialogRef: DynamicDialogRef | null = null;
    public readonly: boolean = true;

    /**
     * If WS update arrives during loading - we mark reload and re-run loadData
     * without dropping the spinner.
     */
    private pendingReload: boolean = false;

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

        if (this.confirmDialogRef) {
            this.confirmDialogRef.close();
            this.confirmDialogRef = null;
        }
    }

    private setLoading(value: boolean): void {
        this.loading = value;
        this.changeDetector.detectChanges();
    }

    private onUpdate(blocks: string[]): void {
        if (!Array.isArray(blocks) || !blocks.includes(this.id)) {
            return;
        }

        if (this.loading) {
            this.pendingReload = true;
            return;
        }

        this.loadData();
    }

    private loadData(): void {
        this.setLoading(true);

        if (this.static) {
            this.applyData(this.static as WriterGetDataResponse | null);
            this.setLoading(false);
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
                finalize(() => {
                    if (this.pendingReload) {
                        this.pendingReload = false;
                        this.loadData();
                        return;
                    }

                    this.setLoading(false);
                }),
            )
            .subscribe((data: WriterGetDataResponse | null) => {
                this.applyData(data);
            });
    }

    private applyData(data: WriterGetDataResponse | null): void {
        if (!data) {
            this.readonly = true;
            this.defaultTopicIds = [];
            this.documentTypeOptions = [];
            return;
        }

        this.readonly = data.readonly;

        this.defaultTopicIds = (data?.defaultTopicIds || [])
            .map((t) => String(t).trim())
            .filter((t) => t.length > 0);

        const userDid = data?.userDid;
        this.showNextButton = Boolean(data?.showNextButton) && !localStorage.getItem('POLICY_HIDE_EVENTS')?.includes(`"${userDid}":{"${this.policyId}":`);

        this.documentTypeOptions = Array.isArray(data?.documentTypeOptions)
            ? data!.documentTypeOptions!
            : [];

        this.streams = (data?.streams || []).map((s) => {
            return {
                topicId: String(s.globalTopicId || '').trim(),
                documentType: (s.documentType || 'any') as GlobalDocumentType,
                active: Boolean(s.active),
            };
        });
    }

    private updateStream(row: WriterStreamRow): void {
        if (this.static) {
            return;
        }

        if (this.loading) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        if (!row) {
            return;
        }

        const topicId = String(row.topicId || '').trim();
        if (!topicId) {
            return;
        }

        this.setLoading(true);

        const payload = {
            operation: 'Update' as WriterOperation,
            streams: [
                {
                    topicId,
                    documentType: (row.documentType || 'any') as GlobalDocumentType,
                    active: Boolean(row.active),
                },
            ],
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e?.error || e);
                    this.setLoading(false);
                    this.loadData();
                },
            );
    }

    public onStreamDocumentTypeChange(row: WriterStreamRow, value: GlobalDocumentType | null): void {
        if (!row) {
            return;
        }

        if (!value) {
            return;
        }

        if (this.loading) {
            return;
        }

        row.documentType = value;
        this.updateStream(row);
    }

    public onActiveChanged(row: WriterStreamRow, value: boolean): void {
        if (!row) {
            return;
        }

        if (this.static) {
            return;
        }

        if (this.loading) {
            return;
        }

        row.active = Boolean(value);
        this.updateStream(row);
    }

    public openAddTopicModal(): void {
        if (this.static) {
            return;
        }

        if (this.loading) {
            return;
        }

        this.addTopicModalTopicId = '';
        this.addTopicModalError = '';
        this.addTopicModalOpen = true;
        this.changeDetector.detectChanges();
    }

    public closeAddTopicModal(): void {
        this.addTopicModalOpen = false;
        this.changeDetector.detectChanges();
    }

    public confirmAddTopicModal(topicId: string): void {
        if (this.static) {
            return;
        }

        if (this.loading) {
            return;
        }

        const trimmedTopicId = String(topicId || '').trim();

        if (!trimmedTopicId) {
            this.addTopicModalError = 'Topic ID is required';
            this.changeDetector.detectChanges();
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.addTopicModalError = '';
        this.setLoading(true);

        this.addTopicModalOpen = false;
        this.addTopicModalError = '';
        this.changeDetector.detectChanges();

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
            .subscribe(
                () => {},
                (e) => {
                    console.error(e?.error || e);
                    this.addTopicModalError = 'Failed to add topic';
                    this.changeDetector.detectChanges();
                },
            );
    }

    public deleteStream(row: WriterStreamRow): void {
        if (!row) {
            return;
        }

        if (this.static) {
            return;
        }

        if (this.loading) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        const topicId = String(row?.topicId || '').trim();
        if (!topicId) {
            return;
        }

        if (this.isDefaultTopic(topicId)) {
            return;
        }

        this.setLoading(true);

        const payload = {
            operation: 'Delete' as WriterOperation,
            streams: [{ topicId }],
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e?.error || e);
                },
            );
    }

    public openCreateTopicModal(): void {
        if (this.static) {
            return;
        }

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
                    { name: 'Cancel', class: 'secondary' },
                    { name: 'Create', class: 'primary' },
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
        if (this.static) {
            return;
        }

        if (this.loading) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        this.setLoading(true);

        const payload = {
            operation: 'CreateTopic' as WriterOperation,
            streams: [],
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {},
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

        this.setLoading(true);

        const payload = {
            operation: 'Next' as any,
            streams: [],
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, payload)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e?.error || e);
                },
            );
    }

    public isDefaultTopic(topicId: string): boolean {
        const normalized = String(topicId || '').trim();
        return this.defaultTopicIds.includes(normalized);
    }

    public trackByTopicId(index: number, row: WriterStreamRow): string {
        const key = String(row?.topicId || '').trim();
        if (key) {
            return key;
        }
        return String(index);
    }
}
