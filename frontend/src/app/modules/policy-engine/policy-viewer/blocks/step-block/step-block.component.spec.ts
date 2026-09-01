import { HttpErrorResponse } from '@angular/common/http';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { IBlock } from '../../../structures';
import { IStepBlockData, StepBlockComponent } from './step-block.component';

/**
 * A step transition makes the API briefly report that the current block is gone
 * ("Block Unavailable") before a follow-up websocket update delivers the next one.
 * Applying that empty result immediately flashed the "This step isn't available to
 * you right now" message for a moment before it disappeared again. The component
 * now waits out that gap, so only a state that outlives it reaches the user.
 */

/** The surface these tests drive, including members that are private on the component. */
interface ITestableStepBlock {
    blocks: IBlock<any>[] | null;
    isActive: boolean;
    loaded: boolean;
    hasError: boolean;
    readonly loading: boolean;
    readonly activeBlock: IBlock<any> | boolean;
    readonly unavailable: boolean;
    readonly errored: boolean;
    readonly pending: boolean;
    setData(data: IStepBlockData | null): void;
    loadData(): void;
    retry(): void;
    ngOnDestroy(): void;
    _onError(error: Pick<HttpErrorResponse, 'status' | 'error'>): void;
}

const DELAY: number = (StepBlockComponent as any).EMPTY_COMMIT_DELAY_MS;

/** Never emits, so a reload leaves the component in its current state. */
const idleService = {
    getBlockData: () => ({ subscribe: () => ({ unsubscribe: () => undefined }) })
} as unknown as PolicyEngineService;

function block(tag: string): IBlock<any> {
    return {
        id: tag,
        tag,
        blockType: 'interfaceStepBlock',
        defaultActive: true,
        permissions: [],
        stateMutation: {},
        onlyOwnDocuments: false,
        uiMetaData: {},
        children: []
    };
}

function blockData(tag: string): IStepBlockData {
    return { blocks: [block(tag)], index: 0, readonly: false };
}

function createComponent(
    policyEngineService: PolicyEngineService = idleService
): ITestableStepBlock {
    const component = new StepBlockComponent(
        policyEngineService,
        {} as WebSocketService,
        {} as PolicyHelper
    );
    return component as unknown as ITestableStepBlock;
}

describe('StepBlockComponent - empty result during a step transition', () => {
    let component: ITestableStepBlock;

    beforeEach(() => {
        jasmine.clock().install();
        component = createComponent();
        // start from a healthy, rendered step
        component.setData(blockData('current'));
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    it('starts out rendering the current step', () => {
        expect(component.activeBlock).toEqual(block('current'));
        expect(component.unavailable).toBe(false);
        expect(component.errored).toBe(false);
        expect(component.loading).toBe(false);
    });

    it('does not show the message while the gap is open', () => {
        component.setData(null);

        jasmine.clock().tick(DELAY - 1);

        expect(component.unavailable).toBe(false);
        expect(component.activeBlock).toEqual(block('current'));
    });

    it('never shows the message when the next block arrives within the gap', () => {
        const seen: boolean[] = [];

        component.setData(null);
        for (let elapsed = 0; elapsed < DELAY - 100; elapsed += 50) {
            jasmine.clock().tick(50);
            seen.push(component.unavailable);
        }

        component.setData(blockData('next'));
        jasmine.clock().tick(DELAY * 5);
        seen.push(component.unavailable);

        // this is the regression: the message must never have been rendered at all
        expect(seen.some(Boolean)).toBe(false);
        expect(component.activeBlock).toEqual(block('next'));
    });

    it('shows the message once the empty state outlives the gap', () => {
        component.setData(null);

        jasmine.clock().tick(DELAY);

        expect(component.unavailable).toBe(true);
        expect(component.errored).toBe(false);
        expect(component.loaded).toBe(true);
        expect(component.blocks).toBeNull();
    });

    it('keeps the spinner up during the gap on a first load', () => {
        const fresh = createComponent();

        fresh.setData(null);
        expect(fresh.loading).toBe(true);
        expect(fresh.unavailable).toBe(false);

        jasmine.clock().tick(DELAY);
        expect(fresh.loading).toBe(false);
        expect(fresh.unavailable).toBe(true);
    });

    it('restarts the wait when a second empty result arrives', () => {
        component.setData(null);
        jasmine.clock().tick(DELAY - 100);

        component.setData(null);
        jasmine.clock().tick(DELAY - 100);
        expect(component.unavailable).toBe(false);

        jasmine.clock().tick(100);
        expect(component.unavailable).toBe(true);
    });

    it('does not apply a pending empty state after the component is destroyed', () => {
        component.setData(null);

        component.ngOnDestroy();
        jasmine.clock().tick(DELAY * 5);

        expect(component.unavailable).toBe(false);
        expect(component.activeBlock).toEqual(block('current'));
    });

    it('drops a pending empty state when the user retries', () => {
        component.setData(null);
        jasmine.clock().tick(DELAY - 100);

        component.retry();               // resets loaded/hasError and reloads
        jasmine.clock().tick(DELAY * 5);

        expect(component.unavailable).toBe(false);
        expect(component.activeBlock).toEqual(block('current'));
    });
});

describe('StepBlockComponent - "Block Unavailable" vs a real failure', () => {
    let component: ITestableStepBlock;

    beforeEach(() => {
        jasmine.clock().install();
        component = createComponent();
        component.setData(blockData('current'));
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    // policy-service raises 503; api-gateway remaps block-data errors to 422, so a
    // genuine "not your turn" arrives as 422 and must NOT become the error card.
    it('maps a 422 "Block Unavailable" to the message, not the error state', () => {
        component._onError({ status: 422, error: { message: 'Block Unavailable' } });

        jasmine.clock().tick(DELAY - 1);
        expect(component.unavailable).toBe(false);   // still inside the gap

        jasmine.clock().tick(1);
        expect(component.unavailable).toBe(true);
        expect(component.errored).toBe(false);
    });

    it('maps a 503 to the message, not the error state', () => {
        component._onError({ status: 503, error: { message: 'Block Unavailable' } });

        jasmine.clock().tick(DELAY);

        expect(component.unavailable).toBe(true);
        expect(component.errored).toBe(false);
    });

    it('shows the error state for a real failure, without waiting', () => {
        component._onError({ status: 500, error: { message: 'Internal Server Error' } });

        expect(component.errored).toBe(true);
        expect(component.unavailable).toBe(false);
        expect(component.loading).toBe(false);
    });

    it('shows the error state for a 422 that is not "Block Unavailable"', () => {
        component._onError({ status: 422, error: { message: 'Validation failed' } });

        expect(component.errored).toBe(true);
        expect(component.unavailable).toBe(false);
    });
});

describe('StepBlockComponent - overlapping reloads', () => {
    it('cancels an in-flight request when a newer reload starts', () => {
        const subscriptions: Array<{ unsubscribe: jasmine.Spy }> = [];
        const policyEngineService = {
            getBlockData: () => ({
                subscribe: () => {
                    const subscription = { unsubscribe: jasmine.createSpy('unsubscribe') };
                    subscriptions.push(subscription);
                    return subscription;
                }
            })
        } as unknown as PolicyEngineService;

        const component = createComponent(policyEngineService);

        component.loadData();
        component.loadData();

        expect(subscriptions.length).toBe(2);
        expect(subscriptions[0].unsubscribe).toHaveBeenCalled();
        expect(subscriptions[1].unsubscribe).not.toHaveBeenCalled();
    });
});

/**
 * A step parked mid-chain is a *successful* response - `{ index, blocks }` with a null
 * entry at `index`, because the active child is a server-side block the container cannot
 * serialize. It therefore never went through the empty-result delay above: it was applied
 * immediately, and the message stayed up for as long as the chain took to run. A
 * monitoring report chain (calc -> save -> table -> save) runs far longer than any delay
 * worth guessing at, which is why the message was still visible after that fix.
 *
 * policy-service now reports this explicitly as `pending`.
 */
describe('StepBlockComponent - step parked on a server-side block', () => {
    let component: ITestableStepBlock;

    /** What getBlockData returns while a chain is running: no renderable active child. */
    function pendingData(): IStepBlockData {
        return { blocks: [block('form'), null as any, null as any], index: 1, readonly: false, pending: true };
    }

    beforeEach(() => {
        jasmine.clock().install();
        component = createComponent();
        component.setData(blockData('current'));
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    it('shows progress, not the "not your turn" message', () => {
        component.setData(pendingData());

        expect(component.pending).toBe(true);
        expect(component.unavailable).toBe(false);
        expect(component.loading).toBe(true);
        expect(component.errored).toBe(false);
    });

    it('keeps showing progress for as long as the chain runs', () => {
        component.setData(pendingData());

        // well past any timeout-based guard
        for (let elapsed = 0; elapsed < DELAY * 20; elapsed += DELAY) {
            jasmine.clock().tick(DELAY);
            expect(component.unavailable).toBe(false);
        }
    });

    it('renders the next step once the chain delivers one', () => {
        component.setData(pendingData());
        component.setData(blockData('next'));

        expect(component.pending).toBe(false);
        expect(component.loading).toBe(false);
        expect(component.activeBlock).toEqual(block('next'));
        expect(component.unavailable).toBe(false);
    });

    it('still shows the message for a genuine role gate', () => {
        // no active child and NOT pending - the workflow really did move to another role
        component.setData({ blocks: [null as any, block('approve')], index: 0, readonly: false });

        expect(component.pending).toBe(false);
        expect(component.unavailable).toBe(true);
        expect(component.loading).toBe(false);
    });

    it('clears pending when an empty result is finally committed', () => {
        component.setData(pendingData());
        component.setData(null);

        jasmine.clock().tick(DELAY + 1);

        expect(component.pending).toBe(false);
        expect(component.unavailable).toBe(true);
    });

    it('treats a missing flag as not pending, so older servers behave as before', () => {
        component.setData({ blocks: [null as any], index: 0, readonly: false });

        expect(component.pending).toBe(false);
        expect(component.unavailable).toBe(true);
    });

    it('drops the pending state when the reload fails', () => {
        // Otherwise `loading` stays true and the spinner renders on top of the error card.
        component.setData(pendingData());

        component._onError({ status: 500, error: { message: 'Internal Server Error' } });

        expect(component.errored).toBe(true);
        expect(component.loading).toBe(false);
        expect(component.pending).toBe(false);
        expect(component.unavailable).toBe(false);
    });

    it('drops the pending state when the user retries', () => {
        component.setData(pendingData());

        component.retry();

        expect(component.pending).toBe(false);
        // still loading, but because the retry request is in flight - not a stale flag
        expect(component.loaded).toBe(false);
    });
});
