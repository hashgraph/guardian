import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Subscription } from 'rxjs';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Component for display block of 'interfaceStepBlock' types.
 */
@Component({
    selector: 'step-block',
    templateUrl: './step-block.component.html',
    styleUrls: ['./step-block.component.scss']
})
export class StepBlockComponent implements OnInit {
    private socket: Subscription | null;

    get loading(): boolean {
        return !this.blocks || !this.blocks.length || !this.activeBlock;
    }

    get activeBlock(): any {
        return this.blocks && this.blocks[this.index] || (this.index === -1);
    }

    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('policyStatus') policyStatus!: string;
    @Input('static') static!: any;
    @Input('dryRun') dryRun!: any;
    @Input('savepointIds') savepointIds?: string[] | null = null;

    blocks: any;
    activeBlockId: any;
    isActive = false;
    readonly: boolean = false;
    private index: number = 0;

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
    ) {
        this.socket = null;
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

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
            }, 500);
        } else {
            this.policyEngineService
                .getBlockData(this.id, this.policyId, this.savepointIds)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        }
    }

    setData(data: any) {
        if (data) {
            this.readonly = !!data.readonly;
            this.isActive = true;
            this.blocks = data.blocks || [];
            this.index = data.index;
        } else {
            this.blocks = null;
            this.index = 0;
            this.isActive = false;
        }
    }
}
