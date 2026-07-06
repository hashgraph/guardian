import { assert } from 'chai';
import { ContextHelper } from '../../../dist/hedera-modules/vcjs/context-helper.js';

describe('ContextHelper.setContext', () => {
    it('returns the vc unchanged when schema is null', () => {
        const vc = { '@context': ['ctx'], a: { b: 1 } };
        const out = ContextHelper.setContext(vc, null);
        assert.strictEqual(out, vc);
    });

    it('strips the temporary __path marker from every nested object', () => {
        const vc = { '@context': ['ctx'], nested: { deep: { leaf: 1 } }, arr: [{ x: 1 }] };
        ContextHelper.setContext(vc, null);
        assert.notProperty(vc, '__path');
        assert.notProperty(vc.nested, '__path');
        assert.notProperty(vc.nested.deep, '__path');
        assert.notProperty(vc.arr[0], '__path');
    });

    it('applies field context.type and top-level @context to ref fields', () => {
        const topContext = ['https://example.org/ctx'];
        const vc = {
            '@context': topContext,
            child: { value: 1 }
        };
        const schema = {
            getField(path) {
                if (path === 'child') {
                    return { isRef: true, context: { type: 'ChildType' } };
                }
                return null;
            }
        };
        ContextHelper.setContext(vc, schema);
        assert.equal(vc.child.type, 'ChildType');
        assert.deepEqual(vc.child['@context'], topContext);
        assert.notProperty(vc.child, '__path');
    });

    it('leaves non-ref fields untouched', () => {
        const vc = { '@context': ['ctx'], plain: { value: 1 } };
        const schema = {
            getField() {
                return { isRef: false };
            }
        };
        ContextHelper.setContext(vc, schema);
        assert.isUndefined(vc.plain.type);
        assert.isUndefined(vc.plain['@context']);
    });

    it('handles arrays and primitives in _getItems traversal', () => {
        const vc = { '@context': ['ctx'], list: [1, 'str', { k: 2 }], n: null };
        const schema = { getField() { return null; } };
        const out = ContextHelper.setContext(vc, schema);
        assert.strictEqual(out, vc);
        assert.notProperty(vc.list[2], '__path');
    });
});
