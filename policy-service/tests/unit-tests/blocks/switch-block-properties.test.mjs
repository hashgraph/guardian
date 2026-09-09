import { assert } from 'chai';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';

const conditionsProperty = () =>
    SwitchBlock.about.properties.find((property) => property.name === 'conditions');

const conditionItemNames = () =>
    conditionsProperty().items.properties.map((property) => property.name);

describe('SwitchBlock condition property declaration', () => {
    it('declares a conditions array with nested item properties', () => {
        const conditions = conditionsProperty();
        assert.isOk(conditions);
        assert.isObject(conditions.items);
        assert.isArray(conditions.items.properties);
    });

    it('declares the condition expression under the key the runtime reads', () => {
        const names = conditionItemNames();
        assert.include(names, 'value');
        assert.notInclude(names, 'condition');
    });

    it('keeps the visible label of that property as Condition', () => {
        const field = conditionsProperty().items.properties
            .find((property) => property.name === 'value');
        assert.equal(field.label, 'Condition');
        assert.equal(field.title, 'Condition');
        assert.isTrue(field.editable);
    });

    it('still declares tag, type and actor under their stored keys', () => {
        const names = conditionItemNames();
        assert.includeMembers(names, ['tag', 'type', 'actor']);
    });

    it('declares every condition item property exactly once', () => {
        const names = conditionItemNames();
        assert.equal(new Set(names).size, names.length);
    });
});
