import { FormulaItemType, IFormulaItem } from '@guardian/interfaces';

const TYPE_NAMES: { [type: string]: string } = {
    [FormulaItemType.Constant]: 'Constant',
    [FormulaItemType.Variable]: 'Variable',
    [FormulaItemType.Formula]: 'Formula',
    [FormulaItemType.Text]: 'Text',
};

/**
 * Data of the confirmation dialog shown before an item is deleted.
 * When other items list the item in their relationships, they are named, because they lose it too.
 */
export function getDeleteDialogData(item: IFormulaItem, referrers: IFormulaItem[]) {
    const kind = (TYPE_NAMES[item.type] || 'Item').toLowerCase();
    if (!referrers.length) {
        return {
            header: 'Delete item',
            text: 'Are you sure want to delete item?',
            buttons: [{ name: 'Close', class: 'secondary' }, { name: 'Delete', class: 'delete' }]
        };
    }
    const name = item.name || 'N/A';
    return {
        header: `Delete ${kind}`,
        text: `"${name}" is used in the Relationships of ${referrers.length === 1 ? 'this item' : `these ${referrers.length} items`}. ` +
            `Deleting it will also remove it from ${referrers.length === 1 ? 'its' : 'their'} Relationships:`,
        details: referrers.map((e) => `${e.name || 'N/A'} (${TYPE_NAMES[e.type] || 'Item'})`),
        buttons: [{ name: 'Cancel', class: 'secondary' }, { name: 'Delete and remove references', class: 'delete' }]
    };
}
