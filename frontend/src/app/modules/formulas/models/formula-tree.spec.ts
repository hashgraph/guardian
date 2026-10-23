import { FormulaItemType, IFormula } from '@guardian/interfaces';
import { FormulaTree } from './formula-tree';

function tree(uuid: string, items: any[]): FormulaTree {
    const formula: IFormula = { uuid, name: uuid, description: '', config: { formulas: items, files: [] } };
    return new FormulaTree(formula);
}

describe('FormulaTree', () => {
    const target = tree('f-1', [
        { uuid: 'item-1', name: 'A', description: '', type: FormulaItemType.Variable, value: '' }
    ]);

    it('finds an item by uuid, as the link dialog stores it', () => {
        expect(target.get('item-1')?.name).toBe('A');
    });

    it('still finds an item by name for older links', () => {
        expect(target.get('A')?.uuid).toBe('item-1');
    });

    it('resolves a formula-to-formula link stored by uuid', () => {
        const source = tree('f-2', [{
            uuid: 'item-2', name: 'B', description: '', type: FormulaItemType.Formula, value: 'x',
            link: { type: 'formula', entityId: 'f-1', item: 'item-1' }, relationships: []
        }]);
        const item: any = source.get('item-2');
        item.setFormulas([target, source]);
        expect(item.linkItem?.uuid).toBe('item-1');
    });
});

describe('FormulaItem links', () => {
    const target = tree('f-1', [
        { uuid: 'item-1', name: 'A', description: '', type: FormulaItemType.Variable, value: '' },
        { uuid: 'item-2', name: 'B', description: '', type: FormulaItemType.Variable, value: '' }
    ]);

    it('reads a single link as a list', () => {
        const source = tree('f-2', [{
            uuid: 'x', name: 'X', description: '', type: FormulaItemType.Formula, value: 'x',
            link: { type: 'formula', entityId: 'f-1', item: 'item-1' }, relationships: []
        }]);
        const item: any = source.get('x');
        expect(item.links.length).toBe(1);
        expect(item.hasLink).toBe(true);
    });

    it('prefers links over link and resolves each of them', () => {
        const source = tree('f-2', [{
            uuid: 'x', name: 'X', description: '', type: FormulaItemType.Formula, value: 'x',
            link: { type: 'formula', entityId: 'f-1', item: 'item-1' },
            links: [
                { type: 'formula', entityId: 'f-1', item: 'item-2' },
                { type: 'formula', entityId: 'f-1', item: 'item-1' }
            ],
            relationships: []
        }]);
        const item: any = source.get('x');
        item.setFormulas([target, source]);
        expect(item.links.map((e: any) => e.linkItem?.uuid)).toEqual(['item-2', 'item-1']);
        expect(item.linkItemName).toBe('B');
        expect(item.createNav(new Set()).children.length).toBe(2);
    });

    it('has no links without link and links', () => {
        const source = tree('f-2', [{ uuid: 'x', name: 'X', description: '', type: FormulaItemType.Text, value: '', relationships: [] }]);
        const item: any = source.get('x');
        expect(item.hasLink).toBe(false);
        expect(item.linkItemName).toBeNull();
    });
});

describe('FormulaItem relationships order', () => {
    it('follows the order of the relationships list, not the order of the items', () => {
        const formula = tree('f-3', [
            { uuid: 'a', name: 'A', description: '', type: FormulaItemType.Variable, value: '' },
            { uuid: 'b', name: 'B', description: '', type: FormulaItemType.Variable, value: '' },
            { uuid: 'c', name: 'C', description: '', type: FormulaItemType.Constant, value: '1' },
            { uuid: 'f', name: 'F', description: '', type: FormulaItemType.Formula, value: 'x', relationships: ['c', 'a', 'missing', 'b'] }
        ]);
        const item: any = formula.get('f');
        expect(item.relationshipItems.map((e: any) => e.uuid)).toEqual(['c', 'a', 'b']);
    });
});
