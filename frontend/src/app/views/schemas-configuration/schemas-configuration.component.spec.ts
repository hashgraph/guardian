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
        component.savedSignatures = new Map<string, string>();
        component.newSchemaKeys = new Set<string>(state.newKeys || []);

        component.router = { url: state.url || '/schema-configuration', navigate: () => Promise.resolve(true) };
        component.route = {};
        component.toasts = [];
        component.toastService = {
            error: (detail: string, action?: string) => { component.toasts.push({ detail, action }); },
            success: () => {},
            warn: () => {},
        };
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

    describe('Rich Text preset dialog', () => {
        it('opens the requested preset and routes its value back to the selected field', () => {
            const component = createComponent();
            component.selectedField = makeField({ default: '<p>Default</p>' });
            component.markDirty = jasmine.createSpy('markDirty');

            component.openRichTextPresetDialog('default');
            component.setRichTextPresetValue('<p>Changed</p>');

            expect(component.richTextPresetTarget).toBe('default');
            expect(component.getRichTextPresetDialogTitle()).toBe('Default value');
            expect(component.getRichTextPresetValue()).toBe('<p>Changed</p>');
            expect(component.selectedField.default).toBe('<p>Changed</p>');
            expect(component.markDirty).toHaveBeenCalled();
        });

        it('writes a Rich Text test value through the existing example value flow', () => {
            const component = createComponent();
            component.selectedField = makeField();
            component.markDirty = jasmine.createSpy('markDirty');

            component.openRichTextPresetDialog('test');
            component.setRichTextPresetValue('<p>Example</p>');

            expect(component.getRichTextPresetDialogTitle()).toBe('Test value');
            expect(component.selectedField.examples).toEqual(['<p>Example</p>']);
        });

        it('survives the card click and the pencil click arriving for the same preset', () => {
            const component = createComponent();
            component.selectedField = makeField({ suggest: '<p>Suggested</p>' });
            component.markDirty = jasmine.createSpy('markDirty');

            component.openRichTextPresetDialog('suggest');
            component.openRichTextPresetDialog('suggest');

            expect(component.richTextPresetTarget).toBe('suggest');
            expect(component.getRichTextPresetValue()).toBe('<p>Suggested</p>');
        });
    });

    describe('a drill edit followed by a sidebar search', () => {

        it('keeps the sub-schema key when the search returns it, and saveAll sends the drill edits', () => {
            const root: any = makeSchema({ id: 'root', iri: '#root', fields: [makeField()] });
            const sub: any = makeSchema({ id: 'sub', iri: '#sub', fields: [makeField({ name: 'f_sub' })] });
            const component = createComponent({ schemas: [root, sub], selectedSchema: root });
            component.drillStack = [{ fieldLabel: 'Sub', fields: sub.fields, schemaIri: '#sub' }];

            component.markDirty();
            expect(Array.from(component.dirtySchemaIds)).toEqual(['sub']);

            const fresh: any = makeSchema({ id: 'sub', iri: '#sub', fields: [makeField({ name: 'f_sub' })] });
            component.schemaService.getSchemasByPage = () => of({
                body: [fresh], headers: { get: () => '1' },
            });

            component.schemas = [];
            component.loadSchemas('topic-1');

            expect(component.dirtySchemaIds.has('sub')).toBeTrue();
            expect(component.hasUnsavedChanges).toBeTrue();

            component.saveAll();
            expect(component.updated.length).toBe(1);
            expect(component.updated[0].fields).toBe(component.drillCurrentFields);
        });

        it('drops the sub-schema key when the search does not return it', () => {
            const root: any = makeSchema({ id: 'root', iri: '#root', fields: [makeField()] });
            const sub: any = makeSchema({ id: 'sub', iri: '#sub', fields: [makeField({ name: 'f_sub' })] });
            const component = createComponent({ schemas: [root, sub], selectedSchema: root });
            component.drillStack = [{ fieldLabel: 'Sub', fields: sub.fields, schemaIri: '#sub' }];

            component.markDirty();
            component.schemaService.getSchemasByPage = () => of({
                body: [], headers: { get: () => '0' },
            });

            component.schemas = [];
            component.loadSchemas('topic-1');

            expect(component.dirtySchemaIds.has('sub')).toBeFalse();
            expect(component.hasUnsavedChanges).toBeFalse();
        });
    });

    // Every error path in this component was a silent no-op: the button stayed enabled,
    // the click fired, and a failed backend call produced no toast, dialog or message -
    // indistinguishable from a dead button.
    describe('backend failures are surfaced', () => {
        it('reports a failed export instead of never opening the dialog', () => {
            const schema: any = makeSchema({ id: 'a' });
            const component = createComponent({ schemas: [schema], selectedSchema: schema });
            component.schemaService.exportInMessage = () => throwError(() => ({ error: { message: 'nope' } }));
            component.dialogService = { open: () => ({ onClose: of(null) }) };

            component.onExport();

            expect(component.toasts.length).toBe(1);
            expect(component.toasts[0].detail).toBe('nope');
            expect(component.toasts[0].action).toBe('Export');
        });

        it('reports a failed deletion preview instead of doing nothing', () => {
            const schema: any = makeSchema({ id: 'a' });
            const component = createComponent({ schemas: [schema], selectedSchema: schema });
            component.schemaService.getSchemaDeletionPreview = () => throwError(() => ({ error: { message: 'blocked' } }));
            component.dialogService = { open: () => ({ onClose: of(null) }) };

            component.onDeleteSchema(schema);

            expect(component.toasts.length).toBe(1);
            expect(component.toasts[0].detail).toBe('blocked');
        });

        it('reports a rejected save and clears the saving flag', () => {
            const schema: any = makeSchema({ id: 'a', fields: [makeField()] });
            const component = createComponent({ schemas: [schema], selectedSchema: schema, dirtyIds: ['a'] });
            component.schemaService.update = () => throwError(() => ({ error: { message: 'rejected' } }));

            component.saveAll();

            expect(component.isSaving).toBeFalse();
            expect(component.toasts.length).toBe(1);
            expect(component.toasts[0].action).toBe('Save all');
        });

        it('falls back to a generic detail when the error carries no message', () => {
            const schema: any = makeSchema({ id: 'a' });
            const component = createComponent({ schemas: [schema], selectedSchema: schema });
            component.schemaService.exportInMessage = () => throwError(() => ({}));
            component.dialogService = { open: () => ({ onClose: of(null) }) };

            component.onExport();

            expect(component.toasts[0].detail).toBe('Unknown error');
        });
    });

    // Dirty tracking was add-only: markDirty() added the schema id and nothing ever
    // removed it, so once touched a schema stayed dirty until saved even if the user
    // undid the change.
    describe('reverting an edit clears the dirty flag', () => {

        function withBaseline() {
            const field = makeField({ name: 'f1', title: 'Original' });
            const schema: any = makeSchema({ id: 'a', fields: [field] });
            const component = createComponent({ schemas: [schema], selectedSchema: schema });
            component.snapshotSchema(schema);
            return { component, schema, field };
        }

        it('marks dirty on edit and clean again on revert', () => {
            const { component, field } = withBaseline();

            field.title = 'Changed';
            component.markDirty();
            expect(component.dirtySchemaIds.has('a')).toBeTrue();
            expect(component.hasUnsavedChanges).toBeTrue();

            field.title = 'Original';
            component.markDirty();
            expect(component.dirtySchemaIds.has('a')).toBeFalse();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('notices an added and then removed field', () => {
            const { component, schema } = withBaseline();

            schema.fields.push(makeField({ name: 'f2' }));
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();

            schema.fields.pop();
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('notices an added and then removed condition', () => {
            const { component, schema } = withBaseline();

            schema.conditions.push({
                ifCondition: { field: { name: 'f1' }, fieldValue: 'x' },
                thenFields: [makeField({ name: 'then_1' })],
                elseFields: [],
            });
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();

            schema.conditions.pop();
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('stays dirty when only part of the edit is reverted', () => {
            const { component, schema, field } = withBaseline();

            field.title = 'Changed';
            schema.fields.push(makeField({ name: 'f2' }));
            component.markDirty();

            field.title = 'Original';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();
        });

        // A false clean would hide Save all and silently discard the user's work, so
        // anything the signature cannot model has to leave the schema dirty.
        it('stays dirty when there is no saved baseline', () => {
            const field = makeField({ name: 'f1' });
            const schema: any = makeSchema({ id: 'a', fields: [field] });
            const component = createComponent({ schemas: [schema], selectedSchema: schema });

            component.markDirty();
            expect(component.dirtySchemaIds.has('a')).toBeTrue();
            component.markDirty();
            expect(component.dirtySchemaIds.has('a')).toBeTrue();
        });

        it('stays dirty when the field tree is cyclic', () => {
            const field = makeField({ name: 'f1' });
            const schema: any = makeSchema({ id: 'a', fields: [field] });
            const component = createComponent({ schemas: [schema], selectedSchema: schema });
            component.snapshotSchema(schema);

            field.fields = [field];
            component.markDirty();
            expect(component.dirtySchemaIds.has('a')).toBeTrue();

            component.markDirty();
            expect(component.dirtySchemaIds.has('a')).toBeTrue();
        });

        it('a never-saved schema is always dirty', () => {
            const schema: any = makeSchema({ uuid: 'u-new' });
            schema.id = undefined;
            schema._id = undefined;
            const component = createComponent({
                schemas: [schema], selectedSchema: schema, newKeys: ['new:u-new'],
            });

            component.markDirty();
            expect(component.dirtySchemaIds.has('new:u-new')).toBeTrue();
        });

        it('a successful save becomes the new baseline', () => {
            const { component, field } = withBaseline();

            field.title = 'Changed';
            component.markDirty();
            component.saveAll();
            expect(component.hasUnsavedChanges).toBeFalse();

            field.title = 'Original';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();
        });
    });

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

        it('returns early and touches nothing when there is nothing to prune', () => {
            const component = createComponent({ schemas: [], dirtyIds: [] });

            component.pruneDirtySchemaIds();

            expect(component.dirtySchemaIds.size).toBe(0);
            expect(component.savedSignatures.size).toBe(0);
        });

        it('drops the saved baseline of a schema that is gone from the list', () => {
            const a = makeSchema({ id: 'a' });
            const component = createComponent({ schemas: [a] });
            component.snapshotSchema(a);
            component.snapshotSchema(makeSchema({ id: 'gone' }));
            expect(component.savedSignatures.size).toBe(2);

            component.pruneDirtySchemaIds();

            expect(Array.from(component.savedSignatures.keys())).toEqual(['a']);
        });

        it('keeps the baseline of the open schema even when the list does not contain it', () => {
            const open = makeSchema({ id: 'open' });
            const component = createComponent({ schemas: [], selectedSchema: open });
            component.snapshotSchema(open);

            component.pruneDirtySchemaIds();

            expect(component.savedSignatures.has('open')).toBeTrue();
        });

        it('still prunes baselines when no key is dirty', () => {
            // The guard used to key off dirtySchemaIds alone, so a baseline could
            // outlive every dirty mark and never be reached.
            const component = createComponent({ schemas: [], dirtyIds: [] });
            component.snapshotSchema(makeSchema({ id: 'gone' }));
            expect(component.savedSignatures.size).toBe(1);

            component.pruneDirtySchemaIds();

            expect(component.savedSignatures.size).toBe(0);
        });
    });

    describe('the signature covers everything the editor can change', () => {

        function withBaseline(schema: any) {
            const component = createComponent({ schemas: [schema], selectedSchema: schema });
            component.snapshotSchema(schema);
            return component;
        }

        // Each of these is editable in the UI but was absent from the old allow-list,
        // so an edit touching only it hashed to the same signature and was discarded.
        [
            ['hidden', true],
            ['isUpdatable', true],
            ['textBold', true],
            ['textColor', '#ff0000'],
            ['default', 'a default'],
            ['suggest', 'a suggestion'],
            ['examples', ['an example']],
        ].forEach(([prop, value]: any) => {
            it(`notices a change to ${prop}`, () => {
                const field = makeField({ name: 'f1' });
                const schema = makeSchema({ id: 'a', fields: [field] });
                const component = withBaseline(schema);

                const before = field[prop];
                field[prop] = value;
                component.markDirty();
                expect(component.hasUnsavedChanges).toBeTrue();

                field[prop] = before;
                component.markDirty();
                expect(component.hasUnsavedChanges).toBeFalse();
            });
        });

        it('notices an edit to a predicate inside an AND condition', () => {
            // ifCondition is { AND: [...] } here, so it has no .field / .fieldValue of
            // its own - reading those two returned undefined for every predicate.
            const target = makeField({ name: 'target' });
            const schema = makeSchema({ id: 'a', fields: [makeField({ name: 'f1' })] });
            schema.conditions = [{
                ifCondition: { AND: [{ field: { name: 'f1' }, fieldValue: 'yes' }] },
                thenFields: [target],
                elseFields: [],
            }];
            const component = withBaseline(schema);

            schema.conditions[0].ifCondition.AND[0].fieldValue = 'no';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();

            schema.conditions[0].ifCondition.AND[0].fieldValue = 'yes';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('notices a predicate added to an OR condition', () => {
            const schema = makeSchema({ id: 'a', fields: [makeField({ name: 'f1' })] });
            schema.conditions = [{
                ifCondition: { OR: [{ field: { name: 'f1' }, fieldValue: 'yes' }] },
                thenFields: [],
                elseFields: [],
            }];
            const component = withBaseline(schema);

            schema.conditions[0].ifCondition.OR.push({ field: { name: 'f2' }, fieldValue: 'x' });
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();

            schema.conditions[0].ifCondition.OR.pop();
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('notices an edit to a then-field of a condition', () => {
            const target = makeField({ name: 'target', title: 'Original' });
            const schema = makeSchema({ id: 'a', fields: [makeField({ name: 'f1' })] });
            schema.conditions = [{
                ifCondition: { field: { name: 'f1' }, fieldValue: 'yes' },
                thenFields: [target],
                elseFields: [],
            }];
            const component = withBaseline(schema);

            target.title = 'Changed';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();

            target.title = 'Original';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('notices an array dependency being added and removed', () => {
            const schema = makeSchema({ id: 'a', fields: [makeField({ name: 'f1' })] });
            schema.arrayDependencies = [];
            const component = withBaseline(schema);

            schema.arrayDependencies.push({ field: ['a'], on: ['b'], kind: 'array' });
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();

            schema.arrayDependencies.pop();
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('signs a tree that reaches the same sub-schema object twice', () => {
            // Two ref fields pointing at one sub-schema IRI share their field objects.
            // A single set for the whole traversal calls the second visit a cycle, so
            // the signature came back null and the schema stayed dirty forever.
            const shared = makeField({ name: 'shared', title: 'Original' });
            const left = makeField({ name: 'left', isRef: true, fields: [shared] });
            const right = makeField({ name: 'right', isRef: true, fields: [shared] });
            const schema = makeSchema({ id: 'a', fields: [left, right] });
            const component = withBaseline(schema);

            expect(component.savedSignatures.get('a')).toBeDefined();

            shared.title = 'Changed';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();

            shared.title = 'Original';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeFalse();
        });

        it('treats a property cleared back to undefined as absent', () => {
            // JSON.stringify drops undefined-valued keys, so the two states save
            // identically; the signature has to agree or the flag can never clear.
            const bare = makeSchema({ id: 'a', fields: [makeField({ name: 'f1' })] });
            const withUndefined = makeSchema({ id: 'a', fields: [makeField({ name: 'f1' })] });
            withUndefined.fields[0].hidden = undefined;
            const component = createComponent({ schemas: [bare] });

            expect(component.schemaSignature(withUndefined)).toBe(component.schemaSignature(bare));
        });

        it('still refuses to sign a genuine cycle', () => {
            const field = makeField({ name: 'f1' });
            field.fields = [field];
            const schema = makeSchema({ id: 'a', fields: [field] });
            const component = createComponent({ schemas: [schema], selectedSchema: schema });

            expect(component.schemaSignature(schema)).toBeNull();
        });

        it('signs a deeply nested field tree', () => {
            // The walk descends every object and array level, so a field one level
            // deeper costs two of the depth budget. A realistic tree must still sign:
            // a throw means "cannot prove clean", which latches Unsaved changes.
            const root = makeField({ name: 'level_0' });
            let cursor = root;
            for (let i = 1; i <= 8; i++) {
                const child = makeField({ name: `level_${i}` });
                cursor.fields = [child];
                cursor = child;
            }
            const schema = makeSchema({ id: 'a', fields: [root] });
            const component = withBaseline(schema);

            expect(component.savedSignatures.get('a')).toBeDefined();

            cursor.title = 'Changed';
            component.markDirty();
            expect(component.hasUnsavedChanges).toBeTrue();
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

    describe('getFieldValueInputType', () => {
        const fieldTypes = [
            { key: 'string', schemaType: 'string' },
            { key: 'number', schemaType: 'number' },
            { key: 'boolean', schemaType: 'boolean' },
            { key: 'date', schemaType: 'string', format: 'date' },
            { key: 'hederaAccount', schemaType: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$', customType: 'hederaAccount' },
            { key: 'richText', schemaType: 'string', customType: 'richText' },
        ];

        function typeOf(field: any): string {
            const component = createComponent();
            component.fieldTypes = fieldTypes;
            return component.getFieldValueInputType(field);
        }

        it('asks for the rich text editor on a rich text field', () => {
            expect(typeOf(makeField({ type: 'string', customType: 'richText' }))).toBe('richText');
        });

        it('keeps a plain string field on a text input', () => {
            expect(typeOf(makeField({ type: 'string' }))).toBe('text');
        });

        it('keeps the other scalar types on their own inputs', () => {
            expect(typeOf(makeField({ type: 'boolean' }))).toBe('boolean');
            expect(typeOf(makeField({ type: 'number' }))).toBe('number');
            expect(typeOf(makeField({ type: 'string', format: 'date' }))).toBe('date');
        });

        it('does not treat another custom type as rich text', () => {
            const account = makeField({
                type: 'string',
                pattern: '^\\d+\\.\\d+\\.\\d+$',
                customType: 'hederaAccount',
            });
            expect(typeOf(account)).not.toBe('richText');
        });
    });
});
