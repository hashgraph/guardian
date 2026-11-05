import { applyNestedConditions, applyViewConditions, evaluateIfCondition } from './schema-form-view-conditions';

describe('schema-form-view-conditions', () => {
    const name = (n: string) => ({ name: n } as any);

    describe('evaluateIfCondition', () => {
        it('judges a single predicate', () => {
            expect(evaluateIfCondition({ field: name('kind'), fieldValue: 'a' }, { kind: 'a' })).toBeTrue();
            expect(evaluateIfCondition({ field: name('kind'), fieldValue: 'a' }, { kind: 'b' })).toBeFalse();
        });

        it('needs every predicate of an AND and one of an OR', () => {
            const predicates = [{ field: name('a'), fieldValue: 1 }, { field: name('b'), fieldValue: 2 }];
            expect(evaluateIfCondition({ AND: predicates }, { a: 1, b: 2 })).toBeTrue();
            expect(evaluateIfCondition({ AND: predicates }, { a: 1, b: 3 })).toBeFalse();
            expect(evaluateIfCondition({ OR: predicates }, { a: 0, b: 2 })).toBeTrue();
            expect(evaluateIfCondition({ OR: predicates }, { a: 0, b: 0 })).toBeFalse();
        });

        it('walks a full path and is false when a step is missing', () => {
            const ic = { field: name('x'), fieldValue: 5, fieldPath: ['sub', 'x'] };
            expect(evaluateIfCondition(ic, { sub: { x: 5 } })).toBeTrue();
            expect(evaluateIfCondition(ic, {})).toBeFalse();
            expect(evaluateIfCondition(ic, undefined)).toBeFalse();
        });

        it('is false for a condition it does not know', () => {
            expect(evaluateIfCondition({}, { a: 1 })).toBeFalse();
        });
    });

    describe('applyViewConditions', () => {
        const condition = { ifCondition: { field: name('kind'), fieldValue: 'a' }, thenFields: [name('x')], elseFields: [name('y')] };

        it('hides the then fields and shows the else fields when the condition fails', () => {
            const fields = [name('x'), name('y')];
            applyViewConditions(fields, [condition], { kind: 'b' });
            expect(fields.map((f: any) => f.notCorrespondCondition)).toEqual([true, false]);
        });

        it('shows the then fields and hides the else fields when it holds', () => {
            const fields = [name('x'), name('y')];
            applyViewConditions(fields, [condition], { kind: 'a' });
            expect(fields.map((f: any) => f.notCorrespondCondition)).toEqual([false, true]);
        });

        it('ignores a missing list of conditions', () => {
            const fields = [name('x')];
            applyViewConditions(fields, undefined, {});
            expect((fields[0] as any).notCorrespondCondition).toBeUndefined();
        });
    });

    describe('applyNestedConditions', () => {
        it('judges the conditions of a sub-schema by its own values', () => {
            const inner = [name('x'), name('y')];
            const fields: any[] = [{
                name: 'sub',
                fields: inner,
                conditions: [{ ifCondition: { field: name('kind'), fieldValue: 'a' }, thenFields: [name('x')], elseFields: [] }],
            }];
            applyNestedConditions(fields, { sub: { kind: 'b' } });
            expect((inner[0] as any).notCorrespondCondition).toBeTrue();
            expect((inner[1] as any).notCorrespondCondition).toBeUndefined();
        });
    });
});
