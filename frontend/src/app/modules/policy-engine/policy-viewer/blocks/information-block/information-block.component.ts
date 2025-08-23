import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Component for display block of 'informationBlock' types.
 */
@Component({
    selector: 'app-information-block',
    templateUrl: './information-block.component.html',
    styleUrls: ['./information-block.component.scss'],
})
export class InformationBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;
    @Input('savepointIds') savepointIds?: string[] | null = null;

    isActive = false;
    loading: boolean = true;
    socket: any;
    content: string | null = null;

    type: any;
    title: any;
    description: any;
    readonly: boolean = false;

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
                .getBlockData(this.id, this.policyId, this.savepointIds)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
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
            const uiMetaData = data.uiMetaData || {};

            this.type = uiMetaData.type;
            this.title = uiMetaData.title;
            this.description = uiMetaData.description;

            this.isActive = true;
        } else {
            this.content = null;
            this.isActive = false;
        }
    }
}
