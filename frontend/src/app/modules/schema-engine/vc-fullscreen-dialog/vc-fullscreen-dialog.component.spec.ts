import { UntypedFormBuilder } from '@angular/forms';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { VCFullscreenDialog } from './vc-fullscreen-dialog.component';

describe('VCFullscreenDialog', () => {
    function build(): any {
        return new VCFullscreenDialog(
            {} as any, { data: {} } as any, {} as any, {} as any, {} as any,
            {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
            {} as any, new UntypedFormBuilder(), {} as any, {} as any, {} as any,
            {} as any,
        );
    }

    // Seven takeUntil sites guarded on a subject nothing ever fired, so every
    // open-and-close of the dialog leaked all of them.
    it('stops its guarded subscriptions on destroy', () => {
        const component = build();
        const source = new Subject<number>();
        const seen: number[] = [];
        source.pipe(takeUntil(component._viewDestroyed$)).subscribe((value) => seen.push(value));

        source.next(1);
        component.ngOnDestroy();
        source.next(2);

        expect(seen).toEqual([1]);
    });

    // _destroy$ may be handed in by the caller as a "close the dialog" signal, so the
    // dialog must not complete a subject its caller still owns and reuses.
    it('leaves a caller-supplied destroy subject usable', () => {
        const component = build();
        const callerOwned = new Subject<void>();
        component._destroy$ = callerOwned;
        let completed = false;
        callerOwned.subscribe({ complete: () => { completed = true; } });

        const received: string[] = [];
        callerOwned.subscribe(() => received.push('signal'));

        component.ngOnDestroy();
        callerOwned.next();

        expect(completed).toBeFalse();
        expect(received).toEqual(['signal']);
    });

    it('unsubscribes the close-signal subscription', () => {
        const component = build();
        const subscription = new Subscription();
        component._subscription = subscription;

        component.ngOnDestroy();

        expect(subscription.closed).toBeTrue();
    });
});
