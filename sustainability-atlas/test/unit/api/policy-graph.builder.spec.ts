import { describe, expect, it } from '@jest/globals';
import { buildPolicyWorkflowGraph } from '@api/services/policy-graph.builder';

describe('buildPolicyWorkflowGraph', () => {
    const rawSchemaJson = {
        '#uuidA&1.0.0': { name: 'Project' },
        '#uuidB&1.0.0': { name: 'Validation' },
    };

    // A small but realistic policy: each role's document + its plumbing live in
    // a step "screen"; the screen's sendToGuardianBlock RunEvent hands off to the
    // next screen (the flow event is on a SIBLING of the document, like real
    // Guardian policies). One RefreshEvent must be ignored.
    const rawPolicyJson = {
        policyRoles: ['Proponent', 'VVB'],
        config: {
            blockType: 'interfaceContainerBlock',
            tag: 'root',
            children: [
                {
                    blockType: 'interfaceStepBlock',
                    tag: 'Proponent_step',
                    permissions: ['Proponent'],
                    children: [
                        {
                            blockType: 'requestVcDocumentBlock',
                            tag: 'Proponent_req_1',
                            permissions: ['Proponent'],
                            schema: '#uuidA&1.0.0',
                        },
                        {
                            blockType: 'sendToGuardianBlock',
                            tag: 'Proponent_send_1',
                            events: [
                                { source: 'Proponent_send_1', target: 'some_table', output: 'RefreshEvent' },
                                { source: 'Proponent_send_1', target: 'VVB_step', output: 'RunEvent' },
                            ],
                        },
                    ],
                },
                {
                    blockType: 'interfaceStepBlock',
                    tag: 'VVB_step',
                    permissions: ['VVB'],
                    children: [
                        {
                            blockType: 'requestVcDocumentBlock',
                            tag: 'VVB_req_1',
                            permissions: ['VVB'],
                            schema: '#uuidB&1.0.0',
                        },
                        {
                            blockType: 'sendToGuardianBlock',
                            tag: 'VVB_send_1',
                            events: [
                                { source: 'VVB_send_1', target: 'Registry_mint_1', output: 'RunEvent' },
                            ],
                        },
                    ],
                },
                {
                    blockType: 'mintDocumentBlock',
                    tag: 'Registry_mint_1',
                    permissions: ['Registry'],
                },
            ],
        },
    };

    it('emits one node per document/action block with correct labels & categories', () => {
        const g = buildPolicyWorkflowGraph(rawPolicyJson, rawSchemaJson);
        expect(g.nodes).toHaveLength(3);

        const byTag = Object.fromEntries(g.nodes.map(n => [n.tag, n]));
        expect(byTag['Proponent_req_1']).toMatchObject({ role: 'Proponent', category: 'document', label: 'Project', schemaUuid: 'uuidA' });
        expect(byTag['VVB_req_1']).toMatchObject({ role: 'VVB', category: 'document', label: 'Validation', schemaUuid: 'uuidB' });
        expect(byTag['Registry_mint_1']).toMatchObject({ role: 'Registry', category: 'action', label: 'Mint Token', schemaUuid: null });
    });

    it('orders roles by policyRoles then appends extras', () => {
        const g = buildPolicyWorkflowGraph(rawPolicyJson, rawSchemaJson);
        expect(g.roles).toEqual(['Proponent', 'VVB', 'Registry']);
    });

    it('emits flow edges that collapse plumbing and drop RefreshEvents', () => {
        const g = buildPolicyWorkflowGraph(rawPolicyJson, rawSchemaJson);
        const flow = g.edges.filter(e => e.kind === 'flow').map(e => `${e.source}->${e.target}`).sort();
        // Proponent screen send → VVB screen (entry doc); VVB screen send → mint.
        expect(flow).toEqual(['Proponent_req_1->VVB_req_1', 'VVB_req_1->Registry_mint_1']);
        // The RefreshEvent target ('some_table') must not appear as any edge.
        expect(g.edges.some(e => e.target === 'some_table')).toBe(false);
        // No self-edges.
        expect(g.edges.some(e => e.source === e.target)).toBe(false);
    });

    it('assigns authored order and per-role sequence edges (no dup of flow pairs)', () => {
        const g = buildPolicyWorkflowGraph(rawPolicyJson, rawSchemaJson);
        // order is the pre-order authored index.
        const order = Object.fromEntries(g.nodes.map(n => [n.tag, n.order]));
        expect(order['Proponent_req_1']).toBeLessThan(order['VVB_req_1']);
        expect(order['VVB_req_1']).toBeLessThan(order['Registry_mint_1']);
        // Each role here has a single node, so there are no intra-lane sequence
        // edges; the cross-lane links are the genuine 'flow' edges.
        expect(g.edges.every(e => e.kind === 'flow')).toBe(true);
    });

    it('collapses repeated blocks that submit the same document schema into one node', () => {
        const dupPolicy = {
            policyRoles: ['Proponent'],
            config: {
                blockType: 'interfaceContainerBlock',
                tag: 'root',
                children: [
                    { blockType: 'requestVcDocumentBlock', tag: 'submit_dmrv', permissions: ['Proponent'], schema: '#uuidA&1.0.0' },
                    { blockType: 'requestVcDocumentBlock', tag: 'edit_dmrv', permissions: ['Proponent'], schema: '#uuidA&1.0.0' },
                ],
            },
        };
        const g = buildPolicyWorkflowGraph(dupPolicy, { '#uuidA&1.0.0': { name: 'dMRV' } });
        // Both blocks use the same schema → a single deduped node.
        expect(g.nodes).toHaveLength(1);
        expect(g.nodes[0]).toMatchObject({ tag: 'submit_dmrv', label: 'dMRV', schemaUuid: 'uuidA' });
        // No edge (single node) and certainly no self-loop on the duplicate.
        expect(g.edges).toEqual([]);
    });

    it('returns an empty graph for malformed/empty input', () => {
        expect(buildPolicyWorkflowGraph(null, null)).toEqual({ roles: [], nodes: [], edges: [] });
        expect(buildPolicyWorkflowGraph({}, {})).toEqual({ roles: [], nodes: [], edges: [] });
        expect(buildPolicyWorkflowGraph({ config: {} }, {})).toEqual({ roles: [], nodes: [], edges: [] });
    });
});
