import { ComparePolicyComponent } from './compare-policy.component';

describe('ComparePolicyComponent', () => {
    function create(): any {
        return Object.create(ComparePolicyComponent.prototype);
    }

    // A degenerate diff arrives with no `report` node. `?.report` already anticipates
    // that, but the loop below it walked `.length` unguarded, so onInit threw after the
    // parent had already cleared its spinner - leaving a broken page.
    it('survives a diff whose blocks report is missing', () => {
        const component = create();
        component.value = {
            total: 0, left: {}, right: {},
            blocks: {}, roles: {}, groups: {}, tokens: {}, topics: {}, tools: {},
        };
        expect(() => component.onInit()).not.toThrow();
        expect(component.blocks).toEqual([]);
    });

    it('still computes _collapse for a populated report', () => {
        const component = create();
        component.value = {
            total: 1, left: {}, right: {},
            blocks: { report: [{ lvl: 0 }, { lvl: 1 }, { lvl: 0 }], columns: [] },
            roles: { report: [] }, groups: { report: [] }, tokens: { report: [] },
            topics: { report: [] }, tools: { report: [] },
        };
        component.onInit();
        expect(component.blocks[0]._collapse).toBe(1);
        expect(component.blocks[1]._collapse).toBe(0);
    });
});
