import { EntityStatus, FormulaItemType, IFormula, IFormulaConfig } from '@guardian/interfaces';
import {
    applyFieldBindingOps,
    applyFieldBindingOpsToFormulas,
    buildFieldPath,
    createStubItem,
    findFieldBindings,
    getItemLinks,
    IFieldTarget,
    isEditableFormula,
    moveLink,
    NEW_FORMULA_DOCUMENT
} from './field-bindings';

const A: IFieldTarget = { schemaIri: '#s1', fieldPath: 'a' };
const B: IFieldTarget = { schemaIri: '#s1', fieldPath: 'b' };
const OTHER: IFieldTarget = { schemaIri: '#s2', fieldPath: 'a' };
const CONDITION: any = { field: { name: 'kind' }, fieldValue: 'x' };

function createConfig(): IFormulaConfig {
    return {
        formulas: [
            { uuid: 'c1', type: FormulaItemType.Constant, name: 'C', description: '', value: '1' },
            { uuid: 'v1', type: FormulaItemType.Variable, name: 'V', description: '', link: { type: 'schema', entityId: '#s1', item: 'a', condition: CONDITION } },
            { uuid: 'f1', type: FormulaItemType.Formula, name: 'F', description: '', link: { type: 'schema', entityId: '#s1', item: 'b' } },
            { uuid: 't1', type: FormulaItemType.Text, name: 'T', description: '', link: null },
        ],
        files: [{ name: 'doc.pdf' }]
    };
}

describe('field-bindings', () => {
    describe('getItemLinks', () => {
        it('falls back to link when links is missing', () => {
            const link: any = { type: 'schema', entityId: '#s1', item: 'a' };
            expect(getItemLinks({ link } as any)).toEqual([link]);
            expect(getItemLinks({ link: null } as any)).toEqual([]);
            expect(getItemLinks(null)).toEqual([]);
        });

        it('prefers links over link', () => {
            const links: any[] = [{ type: 'schema', entityId: '#s1', item: 'b' }];
            expect(getItemLinks({ link: { type: 'schema', entityId: '#s1', item: 'a' }, links } as any)).toEqual(links);
        });
    });

    describe('moveLink', () => {
        it('keeps the condition on the same schema', () => {
            const link = moveLink({ type: 'schema', entityId: '#s1', item: 'a', condition: CONDITION }, B);
            expect(link).toEqual({ type: 'schema', entityId: '#s1', item: 'b', condition: CONDITION });
        });

        it('drops the condition on another schema', () => {
            const link = moveLink({ type: 'schema', entityId: '#s1', item: 'a', condition: CONDITION }, OTHER);
            expect(link).toEqual({ type: 'schema', entityId: '#s2', item: 'a' });
        });

        it('replaces a formula link', () => {
            const link = moveLink({ type: 'formula', entityId: '#s1', item: 'x', condition: CONDITION }, A);
            expect(link).toEqual({ type: 'schema', entityId: '#s1', item: 'a' });
        });
    });

    describe('findFieldBindings', () => {
        it('finds linked variables, formulas and texts of the field', () => {
            const formulas: IFormula[] = [{ id: 'd1', config: createConfig() }];
            expect(findFieldBindings(formulas, A).map((e) => e.item.uuid)).toEqual(['v1']);
            expect(findFieldBindings(formulas, B).map((e) => e.item.uuid)).toEqual(['f1']);
            expect(findFieldBindings(formulas, OTHER)).toEqual([]);
        });

        it('finds an item by any of its links', () => {
            const config = createConfig();
            config.formulas![2].links = [
                { type: 'schema', entityId: '#s1', item: 'b' },
                { type: 'schema', entityId: '#s2', item: 'a' }
            ];
            const formulas: IFormula[] = [{ id: 'd1', config }];
            expect(findFieldBindings(formulas, OTHER).map((e) => e.item.uuid)).toEqual(['f1']);
        });

        it('ignores constants', () => {
            const config = createConfig();
            config.formulas![0].link = { type: 'schema', entityId: '#s1', item: 'a' };
            const found = findFieldBindings([{ id: 'd1', config }], A);
            expect(found.map((e) => e.item.uuid)).toEqual(['v1']);
        });
    });

    describe('applyFieldBindingOps', () => {
        it('does not change the input', () => {
            const config = createConfig();
            const before = JSON.stringify(config);
            applyFieldBindingOps(config, [
                { type: 'bind', formulaId: 'd1', itemUuid: 't1', target: A },
                { type: 'unbind', formulaId: 'd1', itemUuid: 'v1', target: A },
            ]);
            expect(JSON.stringify(config)).toBe(before);
        });

        it('binds, adding a link and keeping the other config parts', () => {
            const { config, skipped } = applyFieldBindingOps(createConfig(), [
                { type: 'bind', formulaId: 'd1', itemUuid: 'v1', target: B },
                { type: 'bind', formulaId: 'd1', itemUuid: 't1', target: OTHER },
            ]);
            expect(skipped).toEqual([]);
            expect(config.files).toEqual([{ name: 'doc.pdf' }]);
            expect(config.formulas![1].links).toEqual([
                { type: 'schema', entityId: '#s1', item: 'a', condition: CONDITION },
                { type: 'schema', entityId: '#s1', item: 'b' }
            ]);
            expect(config.formulas![1].link).toEqual({ type: 'schema', entityId: '#s1', item: 'a', condition: CONDITION });
            expect(config.formulas![3].links).toEqual([{ type: 'schema', entityId: '#s2', item: 'a' }]);
            expect(config.formulas![3].link).toEqual({ type: 'schema', entityId: '#s2', item: 'a' });
        });

        it('does not link the item to the same field twice', () => {
            const { config } = applyFieldBindingOps(createConfig(), [
                { type: 'bind', formulaId: 'd1', itemUuid: 'v1', target: A },
            ]);
            expect(config.formulas![1].links).toBeUndefined();
            expect(getItemLinks(config.formulas![1]).length).toBe(1);
        });

        it('unbinds one link and keeps the others', () => {
            const { config } = applyFieldBindingOps(createConfig(), [
                { type: 'bind', formulaId: 'd1', itemUuid: 'v1', target: B },
                { type: 'unbind', formulaId: 'd1', itemUuid: 'v1', target: A },
            ]);
            expect(config.formulas![1].links).toEqual([{ type: 'schema', entityId: '#s1', item: 'b' }]);
            expect(config.formulas![1].link).toEqual({ type: 'schema', entityId: '#s1', item: 'b' });
        });

        it('moves a link to the new path and keeps its condition', () => {
            const { config } = applyFieldBindingOps(createConfig(), [
                { type: 'move', formulaId: 'd1', itemUuid: 'v1', target: { schemaIri: '#s1', fieldPath: 'z' }, from: 'a' }
            ]);
            const links = getItemLinks(config.formulas![1]);
            expect(links.length).toBe(1);
            expect(links[0].item).toBe('z');
            expect(links[0].condition).toBe(CONDITION);
        });

        it('leaves the link as is when the path does not change', () => {
            const { config } = applyFieldBindingOps(createConfig(), [
                { type: 'move', formulaId: 'd1', itemUuid: 'v1', target: A, from: 'a' }
            ]);
            expect(getItemLinks(config.formulas![1])[0].item).toBe('a');
        });

        it('unbinds only while the item is still on the field', () => {
            const { config } = applyFieldBindingOps(createConfig(), [
                { type: 'unbind', formulaId: 'd1', itemUuid: 'v1', target: A },
                { type: 'unbind', formulaId: 'd1', itemUuid: 'f1', target: A },
            ]);
            expect(config.formulas![1].link).toBeNull();
            expect(config.formulas![1].links).toEqual([]);
            expect(config.formulas![2].link).toEqual({ type: 'schema', entityId: '#s1', item: 'b' });
        });

        it('reports binds of items that no longer exist', () => {
            const op = { type: 'bind' as const, formulaId: 'd1', itemUuid: 'gone', target: A };
            const { config, skipped } = applyFieldBindingOps(createConfig(), [
                op,
                { type: 'unbind', formulaId: 'd1', itemUuid: 'gone2', target: A },
            ]);
            expect(skipped).toEqual([op]);
            expect(config.formulas!.length).toBe(4);
        });

        it('creates a stub once', () => {
            const item = createStubItem('X', 'n1');
            const op = { type: 'create' as const, formulaId: 'd1', item, target: A };
            const { config } = applyFieldBindingOps(createConfig(), [op, op]);
            expect(config.formulas!.length).toBe(5);
            expect(config.formulas![4]).toEqual({
                uuid: 'n1', name: 'X', description: '', type: FormulaItemType.Formula, value: '',
                relationships: [],
                link: { type: 'schema', entityId: '#s1', item: 'a' },
                links: [{ type: 'schema', entityId: '#s1', item: 'a' }]
            });
        });

        it('handles an empty config', () => {
            const item = createStubItem('X', 'n1');
            const { config } = applyFieldBindingOps(undefined, [{ type: 'create', formulaId: 'd1', item, target: A }]);
            expect(config.formulas!.map((e) => e.uuid)).toEqual(['n1']);
        });
    });

    describe('applyFieldBindingOpsToFormulas', () => {
        it('applies the operations by document and adds the new document', () => {
            const untouched: IFormula = { id: 'd2', config: createConfig() };
            const formulas: IFormula[] = [{ id: 'd1', config: createConfig() }, untouched];
            const result = applyFieldBindingOpsToFormulas(formulas, [
                { type: 'unbind', formulaId: 'd1', itemUuid: 'v1', target: A },
                { type: 'create', formulaId: NEW_FORMULA_DOCUMENT, item: createStubItem('N', 'n1'), target: A },
            ], () => ({ name: 'Policy formulas', status: EntityStatus.DRAFT, config: { formulas: [], files: [] } }));
            expect(result.length).toBe(3);
            expect(result[1]).toBe(untouched);
            expect(findFieldBindings(result, A).map((e) => `${e.formula.id}:${e.item.uuid}`))
                .toEqual(['d2:v1', `${NEW_FORMULA_DOCUMENT}:n1`]);
            expect(formulas[0].config!.formulas![1].link).not.toBeNull();
        });
    });

    it('isEditableFormula', () => {
        expect(isEditableFormula({ status: EntityStatus.DRAFT })).toBeTrue();
        expect(isEditableFormula({ status: EntityStatus.DRY_RUN })).toBeTrue();
        expect(isEditableFormula({ status: EntityStatus.PUBLISHED })).toBeFalse();
        expect(isEditableFormula(null)).toBeFalse();
    });

    it('buildFieldPath joins the drilled-into field names and the field name', () => {
        expect(buildFieldPath([], 'G6')).toBe('G6');
        expect(buildFieldPath(['projectRisks'], 'G6')).toBe('projectRisks.G6');
        expect(buildFieldPath(['a', 'b'], 'c')).toBe('a.b.c');
    });
});
