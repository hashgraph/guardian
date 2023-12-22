import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

/**
 * Component for display block of 'multiSignBlock' types.
 */
@Component({
    selector: 'app-multi-sign-block',
    templateUrl: './multi-sign-block.component.html',
    styleUrls: ['./multi-sign-block.component.scss'],
})
export class MultiSignBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    isActive = false;
    loading: boolean = true;
    socket: any;

    data: any;
    status: any;
    confirmationStatus: any;
    documentStatus: any;
    total: any;
    documents: any;
    declined: any;
    signed: any;
    threshold: any;
    declinedCount: any;
    signedCount: any;
    signedMax: any;
    declinedMax: any;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.loading = true;
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(
                    (data: any) => {
                        this.setData(data);
                        this.loading = false;
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    setData(data: any) {
        if (data) {
            this.data = data.data;
            this.status = data.status || {};
            this.confirmationStatus = this.status.confirmationStatus;
            this.documentStatus = this.status.documentStatus;
            this.total = this.status.total;
            this.documents = this.status.data || [];
            if (this.total) {
                this.declined = this.status.declinedPercent;
                this.signed = this.status.signedPercent;
                this.declinedCount = this.status.declinedCount;
                this.signedCount = this.status.signedCount;
                this.threshold = this.status.threshold;
                this.signedMax = this.status.signedThreshold;
                this.declinedMax = this.status.declinedThreshold;
            } else {
                this.declined = 0;
                this.signed = 0;
                this.declinedCount = 0;
                this.signedCount = 0;
                this.threshold = 50;
                this.signedMax = 0;
                this.declinedMax = 0;
            }
            this.isActive = true;
        } else {
            this.isActive = false;
        }
    }

    onSelect(status: any) {
        this.loading = true;
        const data = {
            document: {
                id: this.data.id,
            },
            status,
        };
        this.policyEngineService
            .setBlockData(this.id, this.policyId, data)
            .subscribe(
                () => {},
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                }
            );
    }

    onDetails() {
    }

    onClickMenu(event: any) {
        if (event.stopPropagation) {
            event.stopPropagation();
        }
        return false;
    }
}
