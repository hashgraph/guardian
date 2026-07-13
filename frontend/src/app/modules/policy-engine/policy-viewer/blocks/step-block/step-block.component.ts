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
    styleUrls: ['./step-block.component.scss'],
    standalone: false
})
export class StepBlockComponent implements OnInit {
    private socket: Subscription | null;

    get loading(): boolean {
        // Only spin until the first response has been processed. Previously this
        // getter also returned true whenever there was no active block, which meant
        // a successful response with no viewable active child (e.g. the step advanced
        // to a block this user has no permission for -> the container serializes it as
        // null) left the spinner running forever. See `unavailable` for that case.
        return !this.loaded;
    }

    get activeBlock(): any {
        return this.blocks && this.blocks[this.index] || (this.index === -1);
    }

    get unavailable(): boolean {
        // The block data loaded, but there is no active child to render. This happens
        // when the workflow advanced to a step this user cannot access (role/state
        // gate), so the policy-service container serializes the active child as null.
        // Show a friendly message instead of an endless spinner.
        return this.loaded && !this.activeBlock;
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
    loaded: boolean = false;
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
            this._onSuccess(this.static);
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
        // 503 means the block is no longer available to the user (the workflow
        // advanced past it, or a role/state gate closed it) - clear to the
        // unavailable state. Any other error also stops the spinner and falls
        // through to the unavailable message instead of hanging forever.
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loaded = true;
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
        // A response has been processed - stop the spinner. If there is no active
        // block to render, `unavailable` takes over and shows a friendly message.
        this.loaded = true;
    }
}
