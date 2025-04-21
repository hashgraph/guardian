import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Component for display block of 'requestVcDocument' type.
 */
@Component({
    selector: 'pagination-addon-block',
    templateUrl: './pagination-addon-block.component.html',
    styleUrls: ['./pagination-addon-block.component.scss']
})
export class PaginationAddonBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    data: any;
    uiMetaData: any;
    type: any;
    options: any;
    content: any;
    target: any;
    filters: any;
    currentValue: any;
    size: number;
    itemsPerPage: number;
    page: number;
    readonly: boolean = false;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
    ) {
        this.size = 0;
        this.itemsPerPage = 0;
        this.page = 0;
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(id: string): void {
        if (this.id === id) {
            this.loadData();
        }
    }

    loadData() {
        this.policyEngineService
            .getBlockData(this.id, this.policyId)
            .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
    }

    private _onSuccess(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    setData(data: any) {
        if (data) {
            this.readonly = !!data.readonly;
            this.size = data.size;
            this.itemsPerPage = data.itemsPerPage;
            this.page = data.page;
        } else {
            this.size = 0;
            this.itemsPerPage = 0;
            this.page = 0;
        }
    }

    onChange(data: any) {
        this.size = data.length;
        this.itemsPerPage = data.pageSize;
        this.page = data.pageIndex;

        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                size: this.size,
                itemsPerPage: this.itemsPerPage,
                page: this.page
            }).subscribe(() => {
            }, (e) => {
                console.error(e.error);
            });
    }
}
