import { FormulaItemType, IFormulaItem } from '@guardian/interfaces';
import { formulaTypeIcon } from './formula-meta';

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
    const header = `Delete ${kind}?`;
    if (!referrers.length) {
        return {
            header,
            text: item.name ? `"${item.name}" will be removed from this formula.` : `This ${kind} will be removed from this formula.`,
            buttons: [{ name: 'Cancel', class: 'secondary' }, { name: `Delete ${kind}`, class: 'delete' }]
        };
    }
    const many = referrers.length > 1;
    return {
        header,
        text: `${many ? 'Other items depend' : 'Another item depends'} on this ${kind}. ` +
            `If you delete it, it will also be removed from ${many ? 'their' : 'its'} Relationships:`,
        typedItems: referrers.map((e) => ({
            name: e.name || 'N/A',
            type: e.type,
            icon: formulaTypeIcon(e.type)
        })),
        buttons: [{ name: 'Cancel', class: 'secondary' }, { name: 'Delete anyway', class: 'delete' }]
    };
}
