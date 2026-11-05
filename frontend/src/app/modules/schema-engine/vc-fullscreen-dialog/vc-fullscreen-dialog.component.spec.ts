import { UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, Subscription, of, takeUntil } from 'rxjs';
import { VCFullscreenDialog } from './vc-fullscreen-dialog.component';

describe('VCFullscreenDialog', () => {
    function build(): any {
        return new VCFullscreenDialog(
            {} as any, { data: {} } as any, {} as any, {} as any, {} as any,
            {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
            {} as any, new UntypedFormBuilder(), {} as any, {} as any, {} as any,
            {} as any, {} as any, {} as any,
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

    describe('leaving edit mode with invalid changes', () => {
        const open = (result: unknown) => {
            const component = build();
            const dialog = { open: jasmine.createSpy('open').and.returnValue({ onClose: of(result) }) };
            component.dialog = dialog;
            component.dataForm = new UntypedFormBuilder().group({
                name: ['', Validators.required],
            });
            component.dataForm.markAsDirty();
            component.isEditMode = true;
            component.loadProfile = jasmine.createSpy('loadProfile');
            component.formRoots = { forEach: jasmine.createSpy('forEach') };
            return { component, dialog };
        };

        it('asks to discard, and leaves edit mode on confirmation', () => {
            const { component, dialog } = open(true);
            component.onEditMode();
            expect(dialog.open).toHaveBeenCalledTimes(1);
            const config = dialog.open.calls.mostRecent().args[1];
            expect(config.header).toBe('Unsaved changes');
            expect(config.data.okBtnName).toBe('Discard changes');
            expect(config.data.closeBtnName).toBe('Keep editing');
            expect(component.loadProfile).toHaveBeenCalled();
            expect(component.isEditMode).toBeFalse();
        });

        it('stays in edit mode when the user keeps editing', () => {
            const { component } = open(false);
            component.onEditMode();
            expect(component.loadProfile).not.toHaveBeenCalled();
            expect(component.isEditMode).toBeTrue();
        });

        it('reveals errors instead of asking when it is not a mode switch', () => {
            const { component, dialog } = open(true);
            component.onUpdatableBtnEvent();
            expect(dialog.open).not.toHaveBeenCalled();
            expect(component.formRoots.forEach).toHaveBeenCalled();
        });
    });

    it('edits the first credential subject only', () => {
        const component = build();
        component.subjects = [{ id: 1 }, { id: 2 }, { id: 3 }];
        expect(component.editSubjects).toEqual([{ id: 1 }]);
        component.subjects = [];
        expect(component.editSubjects).toEqual([]);
    });
});
