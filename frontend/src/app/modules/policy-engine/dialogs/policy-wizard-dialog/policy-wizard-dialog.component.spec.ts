import { UntypedFormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PolicyWizardDialogComponent } from './policy-wizard-dialog.component';

describe('PolicyWizardDialogComponent', () => {
    let ref: any;
    let schemaService: any;

    function build(configData: any = {}, schemaResp: any = { schema: null }): any {
        ref = { close: jasmine.createSpy('close') };
        schemaService = {
            getSchemaWithSubSchemas: jasmine.createSpy('getSchemaWithSubSchemas')
                .and.returnValue(of(schemaResp)),
        };
        return new PolicyWizardDialogComponent(
            new UntypedFormBuilder() as any,
            { detectChanges: () => {} } as any,
            (() => 'SchemaName') as any,
            ref as any,
            { header: 'H', data: { schemas: [], policies: [], tokens: [], ...configData } } as any,
            { getPolicyCategories: () => of([]) } as any,
            schemaService as any,
        );
    }

    function stubTree(component: any) {
        component.matTree = jasmine.createSpyObj('matTree', ['refreshTree', 'onPrevClick', 'onNextClick']);
    }

    function validForm(component: any) {
        component.currentNode = { id: 'c1' };
        component.dataForm.get('policy')?.get('name')?.setValue('MyPolicy');
        component.dataForm.get('policy')?.get('policyTag')?.setValue('Tag_1');
    }

    // the selection chain is async map -> await -> Promise.all().then
    async function flushMicrotasks(turns = 20) {
        for (let i = 0; i < turns; i++) {
            await Promise.resolve();
        }
    }

    const schema = (iri: string, refs: string[] = []) => ({
        iri,
        name: iri.slice(1),
        fields: refs.map((type) => ({ isRef: true, type })),
    }) as any;

    // The wizard resolved each selected schema with getSchemaWithSubSchemas but carried
    // only the parent forward, so nothing checked that the referenced chain was present.
    // The failure only appeared later, on the assembled policy.
    describe('missing sub-schema dependencies', () => {
        it('blocks creation and names the unresolved ref', () => {
            const component: any = build();
            validForm(component);
            component.selectedSchemas = [schema('#A', ['#Missing'])];

            component.onCreate();

            expect(ref.close).not.toHaveBeenCalled();
            expect(component.missingSubSchemas).toEqual(['#Missing']);
        });

        it('follows the chain transitively', () => {
            const component: any = build({ schemas: [schema('#B', ['#C']), schema('#C', ['#Gone'])] });
            validForm(component);
            component.selectedSchemas = [schema('#A', ['#B'])];

            component.onCreate();

            expect(component.missingSubSchemas).toEqual(['#Gone']);
            expect(ref.close).not.toHaveBeenCalled();
        });

        it('creates when the whole chain resolves', () => {
            const component: any = build({ schemas: [schema('#B', ['#C']), schema('#C')] });
            validForm(component);
            component.selectedSchemas = [schema('#A', ['#B'])];

            component.onCreate();

            expect(component.missingSubSchemas).toEqual([]);
            expect(ref.close).toHaveBeenCalled();
        });

        it('treats the built-in defs as resolvable', () => {
            const component: any = build();
            validForm(component);
            component.selectedSchemas = [schema('#A', ['#GeoJSON', '#SentinelHUB'])];

            component.onCreate();

            expect(component.missingSubSchemas).toEqual([]);
            expect(ref.close).toHaveBeenCalled();
        });

        it('survives a self-referencing schema', () => {
            const component: any = build();
            validForm(component);
            const a = schema('#A', ['#A']);
            component.selectedSchemas = [a];
            component.resolvedSchemas.set('#A', a);

            expect(() => component.onCreate()).not.toThrow();
            expect(component.missingSubSchemas).toEqual([]);
        });
    });

    // The subscribe had no error arm, so a failed lookup left the promise pending,
    // Promise.all never settled and the wizard silently stopped responding.
    describe('a failed sub-schema lookup', () => {
        it('still settles the selection', async () => {
            const component: any = build();
            stubTree(component);
            spyOn(console, 'error');
            component.selectedSchemas = [];
            component.currentNode = { children: [] as any[] };
            schemaService.getSchemaWithSubSchemas.and.returnValue(throwError(() => new Error('boom')));

            const added = { iri: 'n1', name: 'N1', fields: [], category: 'cat', id: 'i1', topicId: 'tp' };
            component.onSelectedSchemasChange([added]);
            await flushMicrotasks();

            expect(component.selectedSchemas).toEqual([added] as any);
            expect(component.matTree.refreshTree).toHaveBeenCalled();
        });

        it('is reported as a dependency that could not be verified', async () => {
            const component: any = build();
            stubTree(component);
            spyOn(console, 'error');
            component.selectedSchemas = [];
            component.currentNode = { children: [] as any[] };
            schemaService.getSchemaWithSubSchemas.and.returnValue(throwError(() => new Error('boom')));
            component.onSelectedSchemasChange([
                { iri: 'n1', name: 'N1', fields: [], category: 'cat', id: 'i1', topicId: 'tp' },
            ]);
            await flushMicrotasks();

            validForm(component);
            component.onCreate();

            expect(component.missingSubSchemas).toEqual(['n1']);
            expect(ref.close).not.toHaveBeenCalled();
        });
    });

    it('registers the resolved sub-schemas, not just the parent', async () => {
        const component: any = build({}, {
            schema: { iri: '#P', name: 'P', fields: [{ isRef: true, type: '#S' }] },
            subSchemas: [{ iri: '#S', name: 'S', fields: [] }],
        });
        stubTree(component);
        component.selectedSchemas = [];
        component.currentNode = { children: [] as any[] };

        component.onSelectedSchemasChange([{ iri: '#P', category: 'cat', id: 'i1', topicId: 'tp' }]);
        await flushMicrotasks();

        expect(component.resolvedSchemas.has('#S')).toBeTrue();
    });
});

describe('PolicyWizardDialogComponent step-tree labels', () => {
    function makeFull(configData = {}) {
        const fb = new UntypedFormBuilder();
        const ref = { close: jasmine.createSpy('close') };
        const cmp = new PolicyWizardDialogComponent(
            fb as any,
            { detectChanges: () => {} } as any,
            (() => 'SchemaName') as any,
            ref as any,
            { header: 'H', data: { schemas: [], policies: [], tokens: [], ...configData } } as any,
            { getPolicyCategories: () => of([]) } as any,
            { getSchemaWithSubSchemas: () => of({ schema: null }) } as any,
        );
        return { cmp, fb, ref };
    }

    // The schema-role node and the trust-chain-role node were both named
    // "<role> configuration", so the same label appeared under Policy Schemas and again
    // under Trust Chain. The step walk has no wrap-around, but two identically named
    // stops read as one the user keeps coming back to.
    describe('step-tree labels distinguish where a role is configured', () => {
        function addSchemaRole(cmp: any, fb: any, node: any) {
            cmp.onSchemaRoleConfigChange(
                'OWNER',
                [],
                fb.array([]),
                fb.control([]),
                fb.control(false),
                fb.control(''),
                node,
            );
            return node;
        }

        it('names a schema role node after the schema it configures', () => {
            const { cmp, fb } = makeFull({ schemas: [], policies: [], tokens: [] });
            const node = addSchemaRole(cmp, fb, {
                id: '3.1', icon: 'description', children: [] as any[],
                schema: { name: 'Project Description' },
            });
            expect(node.children[0].name).toBe('OWNER in Project Description');
        });

        it('names a trust-chain role node after the trust chain', () => {
            const { cmp } = makeFull({ schemas: [], policies: [], tokens: [] });
            const node: any = { id: '4', icon: 'link', children: [] as any[] };
            (cmp as any).onSelectedTrustChainRoleChange('OWNER', node);
            expect(node.children[0].name).toBe('OWNER trust chain');
        });

        it('gives the same role different labels in the two sections', () => {
            const { cmp, fb } = makeFull({ schemas: [], policies: [], tokens: [] });
            const schemas = addSchemaRole(cmp, fb, {
                id: '3.1', icon: 'description', children: [] as any[],
                schema: { name: 'Project Description' },
            });
            const trustChain: any = { id: '4', icon: 'link', children: [] as any[] };
            (cmp as any).onSelectedTrustChainRoleChange('OWNER', trustChain);

            expect(schemas.children[0].name).not.toBe(trustChain.children[0].name);
        });

        it('falls back to the plain label when the parent carries no schema', () => {
            const { cmp, fb } = makeFull({ schemas: [], policies: [], tokens: [] });
            const node = addSchemaRole(cmp, fb, { id: '3.1', icon: 'description', children: [] as any[] });
            expect(node.children[0].name).toBe('OWNER configuration');
        });
    });
});
