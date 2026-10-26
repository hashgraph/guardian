import assert from 'node:assert/strict';
import {
    findBrokenFormulaLinks,
    getSchemaFieldPaths,
} from '../../dist/helpers/import-helpers/schema/schema-formula-validator.js';

const IRI = '#schema-1';

function formula(items) {
    return [{ name: 'F', config: { formulas: items } }];
}

function schemas(...paths) {
    return new Map([[IRI, new Set(paths)]]);
}

describe('findBrokenFormulaLinks', () => {
    it('reports a renamed key', () => {
        const items = [{ name: 'I', link: { type: 'schema', entityId: IRI, item: 'a' } }];
        const res = findBrokenFormulaLinks(formula(items), schemas('b'));
        assert.equal(res.length, 1);
        assert.equal(res[0].path, 'a');
        assert.match(res[0].text, /Formula "F", item "I"/);
    });

    it('accepts existing nested paths', () => {
        const items = [{ name: 'I', link: { type: 'schema', entityId: IRI, item: 'a.b' } }];
        assert.equal(findBrokenFormulaLinks(formula(items), schemas('a', 'a.b')).length, 0);
    });

    it('reports a missing nested path', () => {
        const items = [{ name: 'I', link: { type: 'schema', entityId: IRI, item: 'a.b' } }];
        assert.equal(findBrokenFormulaLinks(formula(items), schemas('a', 'a.c')).length, 1);
    });

    it('checks condition paths', () => {
        const items = [{
            name: 'I',
            link: {
                type: 'schema', entityId: IRI, item: 'a',
                condition: { AND: [{ fieldPath: ['x', 'y'], fieldValue: 1 }, { fieldPath: ['a'], fieldValue: 1 }] }
            }
        }];
        const res = findBrokenFormulaLinks(formula(items), schemas('a'));
        assert.deepEqual(res.map((r) => r.path), ['x.y']);
    });

    it('checks every link and reports only the broken one', () => {
        const items = [{
            name: 'I',
            links: [
                { type: 'schema', entityId: IRI, item: 'a' },
                { type: 'schema', entityId: IRI, item: 'gone' },
            ]
        }];
        const res = findBrokenFormulaLinks(formula(items), schemas('a'));
        assert.deepEqual(res.map((r) => r.path), ['gone']);
    });

    it('reads a legacy item with only link', () => {
        const items = [{ name: 'I', link: { type: 'schema', entityId: IRI, item: 'gone' } }];
        assert.equal(findBrokenFormulaLinks(formula(items), schemas('a')).length, 1);
    });

    it('ignores formula links and other schemas', () => {
        const items = [
            { name: 'I', link: { type: 'formula', entityId: IRI, item: 'gone' } },
            { name: 'J', link: { type: 'schema', entityId: '#other', item: 'gone' } },
        ];
        assert.equal(findBrokenFormulaLinks(formula(items), schemas('a')).length, 0);
    });

    it('skips paths that were already missing in the baseline', () => {
        const items = [
            { name: 'I', link: { type: 'schema', entityId: IRI, item: 'old' } },
            { name: 'J', link: { type: 'schema', entityId: IRI, item: 'a' } },
        ];
        const res = findBrokenFormulaLinks(formula(items), schemas('b'), schemas('a'));
        assert.deepEqual(res.map((r) => r.path), ['a']);
    });
});

describe('getSchemaFieldPaths', () => {
    it('lists nested field paths', () => {
        const document = {
            $id: '#s',
            title: 's',
            type: 'object',
            properties: {
                a: { title: 'a', type: 'string', readOnly: false },
                b: { title: 'b', $ref: '#child', readOnly: false },
            },
            required: [],
            $defs: {
                '#child': {
                    $id: '#child', title: 'child', type: 'object',
                    properties: { c: { title: 'c', type: 'string', readOnly: false } },
                    required: []
                }
            }
        };
        const paths = getSchemaFieldPaths({ iri: '#s', name: 's', document });
        assert.ok(paths.has('a'));
        assert.ok(paths.has('b'));
        assert.ok(paths.has('b.c'));
    });
});
