import { buildSubjectView, collectLocations, fieldStats, sectionBlocks, sectionCards, sumStats } from './document-view-pages';

describe('document view pages', () => {
    const text = (name: string, extra: any = {}): any => ({ name, description: name, type: 'string', isRef: false, isArray: false, fullPath: name, ...extra });
    const ref = (name: string, fields: any[], extra: any = {}): any => ({ name, description: name, type: `#${name}`, isRef: true, isArray: false, fullPath: name, fields, ...extra });
    const schemaOf = (fields: any[], conditions: any[] = []): any => ({ fields, conditions });

    describe('buildSubjectView', () => {
        it('is flat when there is no sub-schema, without help text and hidden fields', () => {
            const view = buildSubjectView(schemaOf([text('a'), text('b'), text('note', { type: 'null' }), text('c')]), { a: 1 }, { b: true });
            expect(view.sections).toEqual([]);
            expect(view.fields.map(item => item.name)).toEqual(['a', 'c']);
        });

        it('splits into sections and keeps "hidden" fields that have a value', () => {
            const view = buildSubjectView(schemaOf([text('a'), text('secret', { hidden: true }), ref('part', [text('x')]), text('tail')]), { secret: 'yes', part: {} }, {});
            expect(view.sections.map(item => item.title)).toEqual(['part', 'Other details']);
            expect(view.sections[0].fields.map(item => item.name)).toEqual(['a', 'secret', 'part']);
            const empty = buildSubjectView(schemaOf([text('secret', { hidden: true }), ref('part', [])]), {}, {});
            expect(empty.sections[0].fields.map(item => item.name)).toEqual(['part']);
        });

        it('applies the top-level conditions and does not leak them to another subject', () => {
            const schema = schemaOf([text('kind'), text('extra'), ref('part', [text('x')])], [{ ifCondition: { field: { name: 'kind' }, fieldValue: 'a' }, thenFields: [{ name: 'extra' }], elseFields: [] }]);
            const names = (subject: any) => buildSubjectView(schema, subject, {}).sections[0].fields.map(item => item.name);
            expect(names({ kind: 'a' })).toEqual(['kind', 'extra', 'part']);
            expect(names({ kind: 'b' })).toEqual(['kind', 'part']);
            expect(names({ kind: 'a' })).toEqual(['kind', 'extra', 'part']);
            expect(schema.fields.some((item: any) => item.notCorrespondCondition !== undefined)).toBe(false);
        });

        it('promotes a single root: its fields are the sections, read from the root value', () => {
            const root = ref('root', [text('head'), ref('a', [text('x')]), ref('b', [text('y')])], {
                conditions: [{ ifCondition: { field: { name: 'head' }, fieldValue: 'show' }, thenFields: [{ name: 'b' }], elseFields: [] }]
            });
            const subject = { root: { head: 'hide', a: {} } };
            const view = buildSubjectView(schemaOf([root]), subject, {});
            expect(view.rootName).toBe('root');
            expect(view.pathPrefix).toBe('root.');
            expect(view.values).toBe(subject.root);
            expect(view.sections.map(item => item.title)).toEqual(['a']);
            const shown = buildSubjectView(schemaOf([root]), { root: { head: 'show', a: {}, b: {} } }, {});
            expect(shown.sections.map(item => item.title)).toEqual(['a', 'b']);
        });

        it('copes with a schema that is not loaded', () => {
            const view = buildSubjectView(null, { a: 1 }, {});
            expect(view.sections).toEqual([]);
            expect(view.fields).toEqual([]);
        });
    });

    describe('fieldStats', () => {
        const context = (extra: any = {}) => ({ hide: {}, ...extra });

        it('counts values, with false and 0 as provided and empty values as missing', () => {
            const stats = fieldStats([text('a'), text('b'), text('c'), text('d'), text('e')], { a: false, b: 0, c: '', d: [], e: 'x' }, context());
            expect(stats).toEqual({ total: 5, missing: 2, warnings: 0, comments: 0 });
        });

        it('counts an array as one field and walks a sub-schema', () => {
            const fields = [text('list', { isArray: true }), ref('sub', [text('p'), text('q')])];
            const stats = fieldStats(fields, { list: [1, 2, 3], sub: { p: 'x' } }, context());
            expect(stats).toEqual({ total: 3, missing: 1, warnings: 0, comments: 0 });
        });

        it('skips help text, hidden fields and fields of a failed condition, also inside a sub-schema', () => {
            const sub = ref('sub', [text('p'), text('q')], {
                conditions: [{ ifCondition: { field: { name: 'p' }, fieldValue: 'show' }, thenFields: [{ name: 'q' }], elseFields: [] }]
            });
            const fields = [text('a'), text('note', { type: 'null' }), text('h'), sub];
            const stats = fieldStats(fields, { a: 1, sub: { p: 'no' } }, context({ hide: { h: true } }));
            expect(stats.total).toBe(2);
            expect(sub.fields.some((item: any) => item.notCorrespondCondition !== undefined)).toBe(false);
        });

        it('counts failed rule checks and comments by path', () => {
            const rules: any = { a: { status: 'Failure' }, b: { status: 'Success' }, c: { status: 'Error' } };
            const stats = fieldStats([text('a'), text('b'), text('c')], {}, context({ rules, discussion: { a: 2, b: 1 } }));
            expect(stats.warnings).toBe(2);
            expect(stats.comments).toBe(3);
        });

        it('sums the stats of sections', () => {
            expect(sumStats([{ total: 2, missing: 1, warnings: 1, comments: 0 }, { total: 3, missing: 0, warnings: 0, comments: 4 }]))
                .toEqual({ total: 5, missing: 1, warnings: 1, comments: 4 });
        });
    });

    describe('collectLocations', () => {
        it('finds the filled GeoJSON fields with their section, and nothing when there is no value', () => {
            const geo = text('area', { customType: 'geo', description: 'Project area' });
            const sections: any[] = [{ id: 'a', title: 'Alpha', fields: [text('x')] }, { id: 'b', title: 'Beta', fields: [geo, ref('b', [])] }];
            const value = { type: 'Polygon', coordinates: [] };
            expect(collectLocations(sections, { area: value }, {})).toEqual([{ label: 'Project area', value, sectionIndex: 1, sectionTitle: 'Beta', id: 'area', path: 'area' }]);
            expect(collectLocations(sections, {}, {})).toEqual([]);
        });
    });

    describe('sectionCards', () => {
        it('lists the sub-schemas inside the sub-schemas of a section, without the ones a condition hides', () => {
            const part = ref('part', [text('x'), ref('general', []), ref('details', []), ref('extra', [])], {
                conditions: [{ ifCondition: { field: { name: 'x' }, fieldValue: 'show' }, thenFields: [{ name: 'extra' }], elseFields: [] }]
            });
            const section: any = { id: 'part', title: 'part', fields: [text('a'), part] };
            expect(sectionCards(section, { part: { x: 'no' } }, {}).map(item => item.title)).toEqual(['general', 'details']);
            expect(sectionCards(section, { part: { x: 'show' } }, {}).map(item => item.title)).toEqual(['general', 'details', 'extra']);
            expect(sectionCards(section, { part: { x: 'show' } }, { details: true }).map(item => item.title)).toEqual(['general', 'extra']);
        });

        it('has none for a section of plain fields', () => {
            expect(sectionCards({ id: 'a', title: 'a', fields: [text('a')] } as any, {}, {})).toEqual([]);
        });
    });

    describe('collectLocations in lists', () => {
        const geo = (extra: any = {}) => text('area', { customType: 'geo', description: 'Area', ...extra });
        const point = (n: number) => ({ type: 'Point', coordinates: [n, n] });

        it('takes the first row of an array of sub-schemas', () => {
            const rows = ref('places', [geo()], { isArray: true });
            const sections: any[] = [{ id: 's', title: 'Place', fields: [rows] }];
            const found = collectLocations(sections, { places: [{ area: point(1) }, { area: point(2) }] }, {});
            expect(found.map(item => item.value)).toEqual([point(1)]);
            expect(found[0].path).toBe('places.area');
            expect(collectLocations(sections, { places: [] }, {})).toEqual([]);
        });

        it('takes the first map of a list of maps, also inside a sub-schema', () => {
            const list = geo({ isArray: true });
            const sections: any[] = [{ id: 's', title: 'Place', fields: [ref('part', [list])] }];
            const found = collectLocations(sections, { part: { area: [point(3), point(4)] } }, {});
            expect(found.map(item => item.value)).toEqual([point(3)]);
        });
    });

    describe('sectionBlocks', () => {
        it('gives each first-level sub-schema a card with its own heading and the plain fields one without', () => {
            const root = ref('root', [text('head'), ref('general', [text('x')]), ref('details', [text('y')]), text('tail')]);
            const section: any = { id: 'root', title: 'Root', fields: [text('top'), root] };
            const blocks = sectionBlocks(section, { top: 1, root: { head: 'h', general: { x: 1 }, details: { y: 2 }, tail: 't' } }, '', {});
            expect(blocks.map(item => [item.title, item.fields.map(f => f.name)])).toEqual([
                [null, ['top']],
                [null, ['head']],
                ['general', ['x']],
                ['details', ['y']],
                [null, ['tail']],
            ]);
            expect(blocks[2].values).toEqual({ x: 1 });
            expect(blocks[2].prefix).toBe('root.general.');
            expect(blocks[2].linkPrefix).toBe('root.general.');
            expect(blocks[2].id).toBe('general');
        });

        it('marks a sub-schema that was never added and leaves out one a condition hides', () => {
            const root = ref('root', [text('mode'), ref('a', [text('x')]), ref('b', [text('y')])], {
                conditions: [{ ifCondition: { field: { name: 'mode' }, fieldValue: 'on' }, thenFields: [{ name: 'b' }], elseFields: [] }]
            });
            const section: any = { id: 'root', title: 'Root', fields: [root] };
            const blocks = sectionBlocks(section, { root: { mode: 'off' } }, '', {});
            expect(blocks.filter(item => item.title).map(item => [item.title, item.empty])).toEqual([['a', true]]);
        });

        it('keeps an array of sub-schemas in the plain card', () => {
            const rows = ref('rows', [text('x')], { isArray: true });
            const root = ref('root', [ref('a', [text('x')]), rows]);
            const blocks = sectionBlocks({ id: 'r', title: 'R', fields: [root] } as any, { root: { a: { x: 1 }, rows: [{ x: 2 }] } }, '', {});
            expect(blocks.map(item => item.title)).toEqual(['a', null]);
            expect(blocks[1].fields.map(f => f.name)).toEqual(['rows']);
        });
    });
});
