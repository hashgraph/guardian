import assert from 'node:assert/strict';
import {
    CompareOptions,
    IPropertiesLvl,
    IChildrenLvl,
    IEventsLvl,
    IIdLvl,
    IKeyLvl,
    IRefLvl,
} from '../../dist/analytics/compare/interfaces/compare-options.interface.js';

describe('CompareOptions enums', () => {
    it('exposes the documented PropertiesLvl values', () => {
        assert.equal(IPropertiesLvl.None, 'None');
        assert.equal(IPropertiesLvl.Simple, 'Simple');
        assert.equal(IPropertiesLvl.All, 'All');
    });

    it('exposes the documented ChildrenLvl values', () => {
        assert.equal(IChildrenLvl.None, 'None');
        assert.equal(IChildrenLvl.First, 'First');
        assert.equal(IChildrenLvl.All, 'All');
    });

    it('exposes the documented EventsLvl values', () => {
        assert.equal(IEventsLvl.None, 'None');
        assert.equal(IEventsLvl.Simple, 'Simple');
        assert.equal(IEventsLvl.All, 'All');
    });

    it('exposes the documented IdLvl values', () => {
        assert.equal(IIdLvl.None, 'None');
        assert.equal(IIdLvl.All, 'All');
    });

    it('exposes the documented KeyLvl values', () => {
        assert.equal(IKeyLvl.Default, 'Default');
        assert.equal(IKeyLvl.Description, 'Description');
        assert.equal(IKeyLvl.Title, 'Title');
        assert.equal(IKeyLvl.Property, 'Property');
    });

    it('exposes the documented RefLvl values', () => {
        assert.equal(IRefLvl.Default, 'Default');
        assert.equal(IRefLvl.None, 'None');
        assert.equal(IRefLvl.Revert, 'Revert');
        assert.equal(IRefLvl.Direct, 'Direct');
        assert.equal(IRefLvl.Merge, 'Merge');
    });
});

describe('CompareOptions constructor — coerces string-named enums', () => {
    it('accepts the named string values for each axis', () => {
        const o = new CompareOptions('Simple', 'First', 'Simple', 'None', 'Title', 'Direct', 'me');
        assert.equal(o.propLvl, 'Simple');
        assert.equal(o.childLvl, 'First');
        assert.equal(o.eventLvl, 'Simple');
        assert.equal(o.idLvl, 'None');
        assert.equal(o.keyLvl, 'Title');
        assert.equal(o.refLvl, 'Direct');
        assert.equal(o.owner, 'me');
    });
});

describe('CompareOptions constructor — coerces numeric and string-numeric values', () => {
    it('accepts 0/1/2 numbers for propLvl/childLvl/eventLvl', () => {
        const o = new CompareOptions(0, 0, 0, 0, 0, 0, null);
        assert.equal(o.propLvl, 'None');
        assert.equal(o.childLvl, 'None');
        assert.equal(o.eventLvl, 'None');
        assert.equal(o.idLvl, 'None');
        assert.equal(o.keyLvl, 'Default');
        assert.equal(o.refLvl, 'Default');
    });

    it('accepts string-numeric values "1" / "2" / "3" / "4"', () => {
        const o = new CompareOptions('1', '1', '1', '1', '3', '4', null);
        assert.equal(o.propLvl, 'Simple');
        assert.equal(o.childLvl, 'First');
        assert.equal(o.eventLvl, 'Simple');
        assert.equal(o.idLvl, 'All');
        assert.equal(o.keyLvl, 'Property');
        assert.equal(o.refLvl, 'Direct');
    });
});

describe('CompareOptions constructor — defaults for unrecognised input', () => {
    it('defaults propLvl/childLvl/eventLvl to All when invalid', () => {
        const o = new CompareOptions('garbage', 'garbage', 'garbage', 'garbage', 'garbage', 'garbage', null);
        assert.equal(o.propLvl, 'All');
        assert.equal(o.childLvl, 'All');
        assert.equal(o.eventLvl, 'All');
        assert.equal(o.idLvl, 'All');
        assert.equal(o.keyLvl, 'Default');
        assert.equal(o.refLvl, 'Default');
    });
});

describe('CompareOptions.default + .from', () => {
    it('exposes a fully-defaulted singleton', () => {
        const d = CompareOptions.default;
        assert.ok(d instanceof CompareOptions);
        assert.equal(d.propLvl, 'All');
        assert.equal(d.idLvl, 'All');
    });

    it('.from(opts, owner) builds an instance and wires up keyLvl/idLvl alphas', () => {
        const o = CompareOptions.from({
            propLvl: 'Simple',
            childrenLvl: 'First',
            eventsLvl: 'None',
            idLvl: 'None',
            keyLvl: 'Description',
            refLvl: 'Revert',
        }, 'owner-id');
        assert.equal(o.propLvl, 'Simple');
        assert.equal(o.childLvl, 'First');
        assert.equal(o.eventLvl, 'None');
        assert.equal(o.idLvl, 'None');
        assert.equal(o.keyLvl, 'Description');
        assert.equal(o.refLvl, 'Revert');
        assert.equal(o.owner, 'owner-id');
    });

    it('.from accepts an empty object and uses defaults', () => {
        const o = CompareOptions.from({});
        assert.equal(o.propLvl, 'All');
        assert.equal(o.idLvl, 'All');
    });
});
