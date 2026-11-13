import { FormulaItemType, IFormulaItem } from '@guardian/interfaces';
import { getDeleteDialogData } from './formula-delete-dialog';

const item = (uuid: string, name: string, type: FormulaItemType): IFormulaItem => ({ uuid, name, type, value: '', description: '' });

describe('getDeleteDialogData', () => {
    it('says what is removed when nothing references the item', () => {
        const data: any = getDeleteDialogData(item('a', 'A', FormulaItemType.Variable), []);
        expect(data.header).toBe('Delete variable?');
        expect(data.text).toBe('"A" will be removed from this formula.');
        expect(data.typedItems).toBeUndefined();
        expect(data.buttons.map((e: any) => e.name)).toEqual(['Cancel', 'Delete variable']);
    });

    it('lists the items that lose the reference, with their types', () => {
        const data: any = getDeleteDialogData(item('a', 'A', FormulaItemType.Variable), [
            item('m', 'Main', FormulaItemType.Formula),
            item('t', 'Note', FormulaItemType.Text),
        ]);
        expect(data.header).toBe('Delete variable?');
        expect(data.text).toBe('Other items depend on this variable. If you delete it, it will also be removed from their Relationships:');
        expect(data.typedItems.map((e: any) => [e.name, e.type])).toEqual([['Main', 'formula'], ['Note', 'text']]);
        expect(data.typedItems.every((e: any) => !!e.icon)).toBe(true);
        expect(data.buttons.map((e: any) => e.name)).toEqual(['Cancel', 'Delete anyway']);
    });

    it('uses the singular for one referrer', () => {
        const data: any = getDeleteDialogData(item('a', 'A', FormulaItemType.Constant), [item('m', 'Main', FormulaItemType.Formula)]);
        expect(data.header).toBe('Delete constant?');
        expect(data.text).toBe('Another item depends on this constant. If you delete it, it will also be removed from its Relationships:');
    });
});
