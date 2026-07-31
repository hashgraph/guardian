import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Subscription } from 'rxjs';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';
import { IBlock } from '../../../structures';

/**
 * Payload returned by `getBlockData` for a step block: the child blocks of the
 * step and which one of them is currently active.
 */
export interface IStepBlockData {
    blocks?: IBlock<any>[];
    index: number;
    readonly?: boolean;
    /**
     * The active child is a server-side block with no UI, i.e. the workflow is running
     * a chain rather than waiting on another participant.
     */
    pending?: boolean;
}

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
    // In-flight block request. A step transition emits a burst of websocket
    // updates, each triggering a reload; we keep only the latest so a stale
    // intermediate response can't overwrite the UI and flash the "unavailable"
    // message before the real block arrives.
    private dataSub: Subscription | null = null;
    // How long an "empty" result must persist before it is applied. A step
    // transition briefly reports no block; anything shorter than this is a gap
    // between two steps, not a real "not your turn" state.
    private static readonly EMPTY_COMMIT_DELAY_MS = 600;
    private emptyTimer?: ReturnType<typeof setTimeout>;

    get loading(): boolean {
        // Only spin until the first response has been processed. Previously this
        // getter also returned true whenever there was no active block, which meant
        // a successful response with no viewable active child (e.g. the step advanced
        // to a block this user has no permission for -> the container serializes it as
        // null) left the spinner running forever. See `unavailable` for that case.
        //
        // `pending` also spins: the step is sitting on a server-side block while a
        // chain runs, which is progress, not a dead end.
        return !this.loaded || this.pending;
    }

    get pending(): boolean {
        // Reported by policy-service when the active child has no UI. The EMPTY_COMMIT
        // delay below cannot cover this case: a step parked mid-chain is a *successful*
        // 200 response (`{ index, blocks: [...] }` with a null entry at `index`), so it
        // was applied immediately and the message appeared for as long as the chain
        // took - which for a monitoring report is far longer than any timeout worth
        // guessing at.
        return this._pending;
    }

    get activeBlock(): any {
        return this.blocks && this.blocks[this.index] || (this.index === -1);
    }

    get unavailable(): boolean {
        // The block data loaded successfully, but there is no active child to render.
        // This happens when the workflow advanced to a step this user cannot access
        // (role/state gate), so the policy-service container serializes the active
        // child as null. Show a friendly "not your turn" message - NOT an error.
        // A pending step is excluded: nobody else has the turn, the chain is running.
        return this.loaded && !this.hasError && !this.pending && !this.activeBlock;
    }

    get errored(): boolean {
        // A genuine failure while loading the block (server/network error). Kept
        // separate from `unavailable` so we don't hide a real outage behind a
        // reassuring "another participant is handling this step" message.
        return this.loaded && this.hasError;
    }

    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('policyStatus') policyStatus!: string;
    @Input('static') static!: IStepBlockData | null;
    @Input('dryRun') dryRun!: boolean;
    @Input('savepointIds') savepointIds?: string[] | null = null;

    blocks: IBlock<any>[] | null = null;
    isActive = false;
    readonly: boolean = false;
    loaded: boolean = false;
    hasError: boolean = false;
    private index: number = 0;
    private _pending: boolean = false;

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
        this.dataSub?.unsubscribe();
        clearTimeout(this.emptyTimer);
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData(): void {
        if (this.static) {
            this._onSuccess(this.static);
        } else {
            // Cancel any request still in flight so only the latest reload applies.
            this.dataSub?.unsubscribe();
            this.dataSub = this.policyEngineService
                .getBlockData<IStepBlockData | null>(this.id, this.policyId, this.savepointIds)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    retry(): void {
        clearTimeout(this.emptyTimer);
        this.loaded = false;
        this.hasError = false;
        this.loadData();
    }

    private _onSuccess(data: IStepBlockData | null): void {
        this.hasError = false;
        this.setData(data);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        // "Block Unavailable" means the block is no longer available to the user (the
        // workflow advanced past it, or a role/state gate closed it) - clear to the
        // "not your turn" unavailable state. policy-service raises it as 503, but the
        // api-gateway remaps block-data errors to 422, so handle both. Any other
        // status is a genuine failure: stop the spinner but show a distinct error
        // state so a real outage isn't disguised as a normal workflow message.
        const blockUnavailable = e.status === 503 ||
            (e.status === 422 && e.error?.message === 'Block Unavailable');
        if (blockUnavailable) {
            this._onSuccess(null);
        } else {
            this.hasError = true;
            this.loaded = true;
        }
    }

    setData(data: IStepBlockData | null): void {
        clearTimeout(this.emptyTimer);
        if (data) {
            this.readonly = !!data.readonly;
            this.isActive = true;
            this.blocks = data.blocks || [];
            this.index = data.index;
            this._pending = !!data.pending;
            // A response has been processed - stop the spinner.
            this.loaded = true;
        } else {
            // Mid-transition the API briefly reports no block before the follow-up
            // websocket update delivers the next one. Apply the empty state only if
            // it outlives that gap, otherwise the "not available" message flashes up
            // for a moment and then disappears once the real block arrives. A newer
            // response cancels the pending commit via the clearTimeout above.
            this.emptyTimer = setTimeout(() => {
                this.blocks = null;
                this.index = 0;
                this.isActive = false;
                this._pending = false;
                // No active block to render - `unavailable` now shows the message.
                this.loaded = true;
            }, StepBlockComponent.EMPTY_COMMIT_DELAY_MS);
        }
    }
}
