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
        expect(item._linkItem?.uuid).toBe('item-1');
    });
});
