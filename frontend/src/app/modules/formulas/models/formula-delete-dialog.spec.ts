import { FormulaItemType, IFormulaItem } from '@guardian/interfaces';
import { getDeleteDialogData } from './formula-delete-dialog';

const item = (uuid: string, name: string, type: FormulaItemType): IFormulaItem => ({ uuid, name, type, value: '', description: '' });

describe('getDeleteDialogData', () => {
    it('asks a plain question when nothing references the item', () => {
        const data = getDeleteDialogData(item('a', 'A', FormulaItemType.Variable), []);
        expect(data.details).toBeUndefined();
        expect(data.buttons.map((e) => e.name)).toEqual(['Close', 'Delete']);
    });

    it('names the items that lose the reference', () => {
        const data = getDeleteDialogData(item('a', 'A', FormulaItemType.Variable), [
            item('m', 'Main', FormulaItemType.Formula),
            item('t', 'Note', FormulaItemType.Text),
        ]);
        expect(data.header).toBe('Delete variable');
        expect(data.text).toContain('"A"');
        expect(data.details).toEqual(['Main (Formula)', 'Note (Text)']);
        expect(data.buttons.map((e) => e.name)).toEqual(['Cancel', 'Delete and remove references']);
    });
});
