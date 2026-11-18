import { of } from 'rxjs';
import { FormulaItemType } from '@guardian/interfaces';
import { FormulaConfigurationComponent } from './formula-configuration.component';

describe('FormulaConfigurationComponent column links', () => {
    it('saves the column selected in the dialog with the existing display condition', () => {
        const result = { type: 'schema', entityId: '#s', item: 'table', columnKey: 'co2' };
        const component = new FormulaConfigurationComponent({} as any, {} as any,
            { open: () => ({ onClose: of(result) }) } as any, {} as any, {} as any);
        component.schemas = [];
        component.formulas = [];
        component.item = {};
        const condition: any = { field: { name: 'mode' }, fieldValue: 'ready' };
        const item: any = { uuid: 'f', name: 'f', type: FormulaItemType.Formula,
            link: { type: 'schema', entityId: '#s', item: 'table', condition } };
        component.config.fromData({ formulas: [item] });
        component.onLink(item, 0);
        expect(item.links[0]).toEqual({ ...result, condition });
        expect(component.config.getJson().formulas![0].link).toEqual(item.links[0]);
    });
});
