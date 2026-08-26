import { Subject, takeUntil } from 'rxjs';
import { PolicyParametersDialog } from './policy-parameters-dialog.component';

describe('PolicyParametersDialog', () => {
    function build(): any {
        return new PolicyParametersDialog(
            {} as any,
            { data: { policyId: 'p1' } } as any,
            {} as any,
            {} as any,
        );
    }

    // takeUntil(this._destroy$) guarded the ngOnInit subscription, but nothing ever
    // fired the subject, so every open leaked it.
    it('stops its guarded subscriptions on destroy', () => {
        const component = build();
        const source = new Subject<number>();
        const seen: number[] = [];
        source.pipe(takeUntil(component._destroy$)).subscribe((value) => seen.push(value));

        source.next(1);
        component.ngOnDestroy();
        source.next(2);

        expect(seen).toEqual([1]);
    });

    it('completes the subject rather than leaving it open', () => {
        const component = build();

        component.ngOnDestroy();

        // a completed subject completes any later subscriber at once
        let completed = false;
        component._destroy$.subscribe({ complete: () => { completed = true; } });
        expect(completed).toBeTrue();
    });
});
