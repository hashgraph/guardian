import { CompareSchemaComponent } from './compare-schema.component';

describe('CompareSchemaComponent', () => {
    function create(): any {
        return Object.create(CompareSchemaComponent.prototype);
    }

    // See compare-policy: an absent fields report crashed the unguarded loop in onInit.
    it('survives a diff whose fields report is missing', () => {
        const component = create();
        component.value = { total: 0, left: {}, right: {}, fields: {} };
        expect(() => component.onInit()).not.toThrow();
        expect(component.report).toEqual([]);
    });

    it('still computes _collapse for a populated report', () => {
        const component = create();
        component.value = {
            total: 1, left: {}, right: {},
            fields: { report: [{ lvl: 0 }, { lvl: 1 }, { lvl: 0 }], columns: [] },
        };
        component.onInit();
        expect(component.report[0]._collapse).toBe(1);
        expect(component.report[1]._collapse).toBe(0);
    });
});
