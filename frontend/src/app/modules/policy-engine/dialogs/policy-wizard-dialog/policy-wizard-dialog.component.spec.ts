import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { PolicyWizardDialogComponent } from './policy-wizard-dialog.component';

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
