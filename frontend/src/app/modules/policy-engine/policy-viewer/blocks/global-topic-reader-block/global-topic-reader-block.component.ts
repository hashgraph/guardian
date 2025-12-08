import {
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

export interface GlobalTopicStreamRow {
    globalTopicId: string;
    routingHint: string;
    lastMessage: string;
    lastUpdate: string;
    status: string;
    active: boolean;
}

/**
 * Viewer block for reading/configuring global topics.
 * Behaviour mirrors ExternalTopicBlock:
 * - getBlockData(id, policyId) for initial load
 * - WebSocket updates the block by id
 * - setBlockData(id, policyId, { operation, value }) for saving changes
 */
@Component({
    selector: 'global-topic-reader-block',
    templateUrl: './global-topic-reader-block.component.html',
    styleUrls: ['./global-topic-reader-block.component.scss'],
})
export class GlobalTopicReaderBlockComponent implements OnInit, OnDestroy {
    @Input('id')
    public id!: string;

    @Input('policyId')
    public policyId!: string;

    @Input('static')
    public static: any;

    public rows: GlobalTopicStreamRow[] = [];
    public readonly: boolean = false;
    public loading: boolean = true;
    public status: string | null = null;
    public lastUpdate: string | null = null;

    private socket: any;

    constructor(
        private readonly policyEngineService: PolicyEngineService,
        private readonly wsService: WebSocketService,
        private readonly changeDetector: ChangeDetectorRef,
    ) {
    }

    public ngOnInit(): void {
        console.log('GlobalTopicReaderBlock ngOnInit', {
            id: this.id,
            policyId: this.policyId,
            static: this.static
        });

        // Same subscription pattern as in ExternalTopicBlock – listen for block updates
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
        this.status = null;

        // Preview mode (static) – use data provided via `static`
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
                this.changeDetector.detectChanges();
            }, 300);

            return;
        }

        // Normal runtime – fetch data from backend
        this.policyEngineService
            .getBlockData(this.id, this.policyId)
            .subscribe(
                (data) => this.onLoadSuccess(data),
                (error) => this.onLoadError(error),
            );
    }

    private onLoadSuccess(data: any): void {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
            this.changeDetector.detectChanges();
        }, 300);
    }

    private onLoadError(e: HttpErrorResponse): void {
        console.error(e.error);

        if (e.status === 503) {
            this.onLoadSuccess(null);
        } else {
            this.loading = false;
        }
    }

    private setData(data: any): void {
        if (!data) {
            this.rows = [];
            this.readonly = true;
            this.status = null;
            this.lastUpdate = null;
            return;
        }

        this.readonly = !!data.readonly;
        this.status = data.status || null;
        this.lastUpdate = data.lastUpdate || null;

        const streams: any[] = Array.isArray(data.streams)
            ? data.streams
            : [];

        this.rows = streams.map((s: any) => {
            return {
                globalTopicId: s.globalTopicId || '',
                routingHint: s.routingHint || '',
                lastMessage: s.lastMessage || '',
                lastUpdate: s.lastUpdate || '',
                status: s.status || '',
                active: !!s.active,
            } as GlobalTopicStreamRow;
        });
    }

    public addRow(): void {
        if (this.readonly) {
            return;
        }

        this.rows = [
            ...this.rows,
            {
                globalTopicId: '',
                routingHint: '',
                lastMessage: '',
                lastUpdate: '',
                status: '',
                active: true,
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

    public save(): void {
        if (this.readonly) {
            return;
        }

        if (!this.policyId || !this.id) {
            return;
        }

        const payload = {
            streams: this.rows
                .filter((r) => !!r.globalTopicId && r.globalTopicId.trim().length > 0)
                .map((r) => {
                    return {
                        globalTopicId: r.globalTopicId.trim(),
                        routingHint: r.routingHint?.trim() || null,
                        active: !!r.active,
                    };
                }),
        };

        this.loading = true;

        // `operation` must match server-side implementation for this block
        const data = {
            operation: 'UpdateStreams',
            value: payload,
        };

        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(
                () => {
                    this.loadData();
                },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                },
            );
    }
}
