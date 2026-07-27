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
