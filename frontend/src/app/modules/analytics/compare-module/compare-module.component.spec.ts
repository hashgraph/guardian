import { CompareModuleComponent } from './compare-module.component';

describe('CompareModuleComponent', () => {
    function create(): any {
        return Object.create(CompareModuleComponent.prototype);
    }

    // See compare-policy: an absent blocks report crashed the unguarded loop in onInit.
    it('survives a diff whose blocks report is missing', () => {
        const component = create();
        component.value = {
            total: 0, left: {}, right: {},
            blocks: {}, inputEvents: {}, outputEvents: {}, variables: {},
        };
        expect(() => component.onInit()).not.toThrow();
        expect(component.blocks).toEqual([]);
    });

    it('still computes _collapse for a populated report', () => {
        const component = create();
        component.value = {
            total: 1, left: {}, right: {},
            blocks: { report: [{ lvl: 0 }, { lvl: 1 }, { lvl: 0 }], columns: [] },
            inputEvents: { report: [] }, outputEvents: { report: [] }, variables: { report: [] },
        };
        component.onInit();
        expect(component.blocks[0]._collapse).toBe(1);
        expect(component.blocks[1]._collapse).toBe(0);
    });
});
