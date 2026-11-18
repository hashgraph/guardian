import { buildSchemaNames, restoreSchemaDefs } from './schema-defs';

describe('restoreSchemaDefs', () => {
    const make = () => [
        { iri: '#root', defs: ['#sub'], document: { title: 'Root', $defs: undefined } },
        { iri: '#sub', defs: [], document: { title: 'Sub' } },
        { iri: '#lonely', defs: [], document: { title: 'Lonely' } }
    ];

    it('puts the referenced sub-schemas back into $defs', () => {
        const [root] = restoreSchemaDefs(make());
        expect(root.document.$defs).toEqual({ '#sub': { title: 'Sub' } });
    });

    it('leaves schemas without defs untouched', () => {
        const result = restoreSchemaDefs(make());
        expect(result[1].document).toEqual({ title: 'Sub' });
        expect(result[2].document).toEqual({ title: 'Lonely' });
    });

    it('does not touch a document that already has $defs', () => {
        const inline = { '#sub': { title: 'Inline' } };
        const schemas = [{ iri: '#a', defs: ['#sub'], document: { $defs: inline } }, { iri: '#sub', document: { title: 'Sub' } }];
        expect(restoreSchemaDefs(schemas)[0].document.$defs).toBe(inline);
    });
});

describe('buildSchemaNames', () => {
    it('maps the iri to the schema name', () => {
        const names = buildSchemaNames([{ iri: '#a', id: '1', name: 'A' }, { iri: '#b', name: 'B' }]);
        expect(names.get('#a')).toBe('A');
        expect(names.get('#b')).toBe('B');
        expect(names.has('1')).toBe(false);
    });

    it('falls back to the id when there is no iri', () => {
        expect(buildSchemaNames([{ id: '7', name: 'Seven' }]).get('7')).toBe('Seven');
    });

    it('uses an empty name when the schema has none', () => {
        expect(buildSchemaNames([{ iri: '#a' }]).get('#a')).toBe('');
    });
});
