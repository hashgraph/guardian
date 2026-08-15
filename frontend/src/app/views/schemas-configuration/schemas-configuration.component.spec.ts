import { of, Subject, throwError } from 'rxjs';
import { SchemasConfigurationComponent } from './schemas-configuration.component';

describe('SchemasConfigurationComponent', () => {

    function makeSchema(overrides: any = {}): any {
        const schema: any = {
            id: overrides.id,
            _id: overrides.id,
            uuid: overrides.uuid || `uuid-${overrides.id || 'x'}`,
            iri: overrides.iri || `#${overrides.id || 'x'}`,
            name: overrides.name || 'Schema',
            status: overrides.status || 'DRAFT',
            entity: overrides.entity || '',
            topicId: 'topic-1',
            conditions: [],
            fields: overrides.fields || [],
            document: overrides.document || { $defs: {} },
            update: () => {},
        };
        return schema;
    }

    function makeField(overrides: any = {}): any {
        return {
            name: overrides.name || 'field_1',
            title: overrides.title || 'Field',
            description: overrides.description || 'A field',
            type: 'string',
            enum: undefined,
            dependency: undefined,
            ...overrides,
        };
    }

    function createComponent(state: any = {}): any {
        const component: any = Object.create(SchemasConfigurationComponent.prototype);

        component.created = [];
        component.updated = [];
        component.templateSaves = [];

        component.destroy$ = new Subject<void>();
        component.type = state.type || '';
        component.topic = 'topic-1';
        component.templateId = '';
        component.schemas = state.schemas || [];
        component.selectedSchema = state.selectedSchema ?? null;
        component.selectedField = null;
        component.schemaTemplate = state.schemaTemplate ?? null;
        component.templateConfigDirty = !!state.templateConfigDirty;
        component.templateConfigSaving = false;
        component.isSaving = !!state.isSaving;
        component.drillStack = [];
        component.schemaEditVersion = 0;
        component.schemasLoading = false;
        component.schemasLoadingMore = false;
        component.schemasFetched = false;
        component.schemasTotal = 0;
        component.schemasPage = 0;
        component.schemaSearch = '';
        component.dirtySchemaIds = new Set<string>(state.dirtyIds || []);
        component.newSchemaKeys = new Set<string>(state.newKeys || []);

        component.router = { url: state.url || '/schema-configuration', navigate: () => Promise.resolve(true) };
        component.route = {};
        component.schemaService = {
            update: (s: any) => { component.updated.push(s); return of([]); },
            create: (_c: any, s: any) => { component.created.push(s); return of([]); },
            updateSystemSchema: (s: any) => { component.updated.push(s); return of([]); },
            getSchemasByPage: () => of({ body: [], headers: { get: () => '0' } }),
        };
        component.tagsService = { updateSchema: (s: any) => { component.updated.push(s); return of([]); } };
        component.schemaTemplatesService = {
            update: (_id: string, body: any) => { component.templateSaves.push(body); return of({}); },
        };
        component.projectComparisonService = { getProperties: () => of([]) };
        component._cancelLoadSchemas$ = new Subject<void>();
        component._subSchemasByIri = new Map();

        component._buildRefs = () => ({});
        component.loadAppliedSchemaTemplate = () => {};
        component.rebuildPreview = () => {};
        component.loadParentSchemas = () => {};
        component.getCategory = () => 'POLICY';

        return component;
    }

    describe('pruneDirtySchemaIds', () => {

        it('keeps a dirty key whose schema is still in the reloaded list', () => {
            const a = makeSchema({ id: 'a' });
            const component = createComponent({ schemas: [a], dirtyIds: ['a'] });

            component.pruneDirtySchemaIds();

            expect(Array.from(component.dirtySchemaIds)).toEqual(['a']);
            expect(component.hasUnsavedChanges).toBeTrue();
        });

        it('drops a dirty key whose schema is gone from the reloaded list', () => {
            const b = makeSchema({ id: 'b' });
            const component = createComponent({ schemas: [b], dirtyIds: ['a'] });

            component.pruneDirtySchemaIds();

            expect(component.dirtySchemaIds.size).toBe(0);
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('keeps the open schema key even when the reloaded list does not contain it', () => {
            const a = makeSchema({ id: 'a' });
            const b = makeSchema({ id: 'b' });
            const component = createComponent({ schemas: [b], selectedSchema: a, dirtyIds: ['a'] });

            component.pruneDirtySchemaIds();

            expect(Array.from(component.dirtySchemaIds)).toEqual(['a']);
        });

        it('keeps a new-schema key for the open unsaved schema, with its newSchemaKeys entry', () => {
            const fresh = makeSchema({ id: undefined, uuid: 'u-new' });
            fresh.id = undefined;
            fresh._id = undefined;
            const component = createComponent({
                schemas: [],
                selectedSchema: fresh,
                dirtyIds: ['new:u-new'],
                newKeys: ['new:u-new'],
            });

            component.pruneDirtySchemaIds();

            expect(component.dirtySchemaIds.has('new:u-new')).toBeTrue();
            expect(component.newSchemaKeys.has('new:u-new')).toBeTrue();
        });

        it('drops a new-schema key that is in neither the list nor the open slot', () => {
            const component = createComponent({
                schemas: [],
                selectedSchema: null,
                dirtyIds: ['new:u-gone'],
                newKeys: ['new:u-gone'],
            });

            component.pruneDirtySchemaIds();

            expect(component.dirtySchemaIds.size).toBe(0);
            expect(component.newSchemaKeys.size).toBe(0);
        });

        it('removes nothing when every dirty key is still reachable', () => {
            const a = makeSchema({ id: 'a' });
            const b = makeSchema({ id: 'b' });
            const component = createComponent({ schemas: [a, b], dirtyIds: ['a', 'b'] });

            component.pruneDirtySchemaIds();

            expect(Array.from(component.dirtySchemaIds).sort()).toEqual(['a', 'b']);
        });

        it('returns early and touches nothing when there are no dirty keys', () => {
            const component = createComponent({ schemas: [], dirtyIds: [] });

            component.pruneDirtySchemaIds();

            expect(component.dirtySchemaIds.size).toBe(0);
        });
    });

    describe('a failed sidebar list load', () => {

        function failingComponent(state: any = {}): any {
            const component = createComponent(state);
            component.schemaService.getSchemasByPage = () => throwError(() => new Error('boom'));
            return component;
        }

        it('drops the dirty key of a schema that was only in the list', () => {
            const a = makeSchema({ id: 'a' });
            const component = failingComponent({ schemas: [a], dirtyIds: ['a'] });

            component.loadSchemas('topic-1');

            expect(component.schemas).toEqual([]);
            expect(component.dirtySchemaIds.size).toBe(0);
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('keeps the open schema key, and saveAll still sends it', () => {
            const a = makeSchema({ id: 'a', fields: [makeField()] });
            const component = failingComponent({ schemas: [a], selectedSchema: a, dirtyIds: ['a'] });

            component.loadSchemas('topic-1');

            expect(component.dirtySchemaIds.has('a')).toBeTrue();
            component.saveAll();
            expect(component.updated.length).toBe(1);
        });

        it('keeps a new-schema key for the open unsaved schema', () => {
            const fresh = makeSchema({ uuid: 'u-new', fields: [makeField()] });
            fresh.id = undefined;
            fresh._id = undefined;
            const component = failingComponent({
                schemas: [fresh], selectedSchema: fresh,
                dirtyIds: ['new:u-new'], newKeys: ['new:u-new'],
            });

            component.loadSchemas('topic-1');

            expect(component.dirtySchemaIds.has('new:u-new')).toBeTrue();
            expect(component.newSchemaKeys.has('new:u-new')).toBeTrue();
        });

        it('leaves the list and the dirty keys alone when an append fails', () => {
            const a = makeSchema({ id: 'a' });
            const b = makeSchema({ id: 'b' });
            const component = failingComponent({ schemas: [a, b], dirtyIds: ['a', 'b'] });

            component.loadSchemas('topic-1', true);

            expect(component.schemas.length).toBe(2);
            expect(component.dirtySchemaIds.size).toBe(2);
            expect(component.schemasLoadingMore).toBeFalse();
        });

        it('clears the loading flag on a failed full load', () => {
            const component = failingComponent({ schemas: [], dirtyIds: [] });

            component.loadSchemas('topic-1');

            expect(component.schemasLoading).toBeFalse();
        });
    });

    describe('saveAll resolving a new unsaved schema', () => {

        function newSchemaComponent(state: any): any {
            const fresh = makeSchema({ uuid: 'u-new', fields: [makeField()] });
            fresh.id = undefined;
            fresh._id = undefined;
            const component = createComponent({
                schemas: state.inList ? [fresh] : [],
                selectedSchema: state.open ? fresh : null,
                dirtyIds: ['new:u-new'],
                newKeys: ['new:u-new'],
            });
            return component;
        }

        it('creates it from the open schema when the list is empty', () => {
            const component = newSchemaComponent({ open: true, inList: false });

            component.saveAll();

            expect(component.created.length).toBe(1);
            expect(component.created[0].uuid).toBe('u-new');
        });

        it('still creates it from the list when it is not the open schema', () => {
            const component = newSchemaComponent({ open: false, inList: true });

            component.saveAll();

            expect(component.created.length).toBe(1);
        });

        it('sends nothing when it is in neither place', () => {
            const component = newSchemaComponent({ open: false, inList: false });

            component.saveAll();

            expect(component.created.length).toBe(0);
            expect(component.updated.length).toBe(0);
        });

        it('creates and updates in the same run when both are dirty', () => {
            const saved = makeSchema({ id: 'a', fields: [makeField()] });
            const fresh = makeSchema({ uuid: 'u-new', fields: [makeField()] });
            fresh.id = undefined;
            fresh._id = undefined;
            const component = createComponent({
                schemas: [saved],
                selectedSchema: fresh,
                dirtyIds: ['a', 'new:u-new'],
                newKeys: ['new:u-new'],
            });

            component.saveAll();

            expect(component.created.length).toBe(1);
            expect(component.updated.length).toBe(1);
        });

        it('does not confuse the open saved schema with a new-schema key', () => {
            const saved = makeSchema({ id: 'a', uuid: 'u-new', fields: [makeField()] });
            const component = createComponent({
                schemas: [saved],
                selectedSchema: saved,
                dirtyIds: ['a'],
            });

            component.saveAll();

            expect(component.created.length).toBe(0);
            expect(component.updated.length).toBe(1);
        });
    });

    describe('save invariant: after any list change, an enabled Save all always sends something', () => {

        function saveButtonEnabled(component: any): boolean {
            return !(component.isTemplateReadonly
                || !component.hasUnsavedChanges
                || component.isSaving
                || (!component.isTemplateConfigMode && component.currentSchemaErrorCount > 0));
        }

        function sentCount(component: any): number {
            return component.created.length + component.updated.length + component.templateSaves.length;
        }

        const validField = () => makeField({ name: 'field_1', title: 'Field', description: 'A field' });
        const brokenField = () => makeField({ name: '', title: '', description: '' });

        const states: { name: string; build: () => any; pending?: string }[] = [
            {
                name: 'nothing dirty',
                build: () => createComponent({ schemas: [makeSchema({ id: 'a' })] }),
            },
            {
                name: 'dirty schema is the open one',
                build: () => {
                    const a = makeSchema({ id: 'a', fields: [validField()] });
                    return createComponent({ schemas: [a], selectedSchema: a, dirtyIds: ['a'] });
                },
            },
            {
                name: 'dirty schema is in the list but not open',
                build: () => {
                    const a = makeSchema({ id: 'a', fields: [validField()] });
                    const b = makeSchema({ id: 'b', fields: [validField()] });
                    return createComponent({ schemas: [a, b], selectedSchema: b, dirtyIds: ['a'] });
                },
            },
            {
                name: 'dirty schema is neither open nor in the list',
                build: () => {
                    const b = makeSchema({ id: 'b', fields: [validField()] });
                    return createComponent({ schemas: [b], selectedSchema: b, dirtyIds: ['a'] });
                },
            },
            {
                name: 'one dirty schema resolvable, one not',
                build: () => {
                    const a = makeSchema({ id: 'a', fields: [validField()] });
                    return createComponent({ schemas: [a], selectedSchema: a, dirtyIds: ['a', 'gone'] });
                },
            },
            {
                name: 'empty list, nothing open',
                build: () => createComponent({ schemas: [], selectedSchema: null, dirtyIds: ['a'] }),
            },
            {
                name: 'new unsaved schema, open, present in the list',
                build: () => {
                    const fresh = makeSchema({ uuid: 'u-new', fields: [validField()] });
                    fresh.id = undefined;
                    fresh._id = undefined;
                    return createComponent({
                        schemas: [fresh], selectedSchema: fresh,
                        dirtyIds: ['new:u-new'], newKeys: ['new:u-new'],
                    });
                },
            },
            {
                name: 'new unsaved schema, open, list emptied by a search',
                build: () => {
                    const fresh = makeSchema({ uuid: 'u-new', fields: [validField()] });
                    fresh.id = undefined;
                    fresh._id = undefined;
                    return createComponent({
                        schemas: [], selectedSchema: fresh,
                        dirtyIds: ['new:u-new'], newKeys: ['new:u-new'],
                    });
                },
            },
            {
                name: 'save already in flight',
                build: () => {
                    const a = makeSchema({ id: 'a', fields: [validField()] });
                    return createComponent({ schemas: [a], selectedSchema: a, dirtyIds: ['a'], isSaving: true });
                },
            },
            {
                name: 'dirty schema has an invalid field',
                build: () => {
                    const a = makeSchema({ id: 'a', fields: [brokenField()] });
                    return createComponent({ schemas: [a], selectedSchema: a, dirtyIds: ['a'] });
                },
            },
            {
                name: 'published template, read only',
                build: () => {
                    const a = makeSchema({ id: 'a', fields: [validField()] });
                    return createComponent({
                        schemas: [a], selectedSchema: a, dirtyIds: ['a'],
                        type: 'template', schemaTemplate: { id: 't1', status: 'PUBLISHED' },
                    });
                },
            },
            {
                name: 'template configuration route, template marked dirty',
                build: () => createComponent({
                    url: '/schema-template-configuration',
                    schemaTemplate: { id: 't1', status: 'DRAFT', config: {} },
                    templateConfigDirty: true,
                }),
            },
        ];

        states.forEach((state) => {
            const title = `${state.name}: if the button is enabled, a click sends at least one request`;
            const runner = state.pending ? xit : it;
            runner(title, () => {
                const component = state.build();
                component.pruneDirtySchemaIds();

                if (!saveButtonEnabled(component)) {
                    component.saveAll();
                    expect(sentCount(component)).toBe(0);
                    return;
                }

                component.saveAll();
                expect(sentCount(component))
                    .toBeGreaterThan(0, `enabled button sent nothing for state: ${state.name}`);
            });
        });
    });
});
