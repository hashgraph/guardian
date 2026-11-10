import { resetMathLinkSchemas } from './math-schema-reset';

describe('resetMathLinkSchemas', () => {
    const build = () => ({
        variables: [{
            type: 'group', name: 'Tab1', items: [
                { type: 'link', name: 'a', field: 'x', schema: '#old' },
                { type: 'link', name: 'b', field: 'y', schema: '' },
                { type: 'link', name: 'c', field: 'z', schema: '#other' },
            ]
        }],
        formulas: [],
        outputs: [{
            type: 'group', name: 'Tab1', items: [
                { type: 'link', name: 'o', field: 'x', schema: '#oldOut' },
            ]
        }],
    });

    it('resets input links pinned to the old input schema and keeps cross-schema links', () => {
        const expression = build();
        const changed = resetMathLinkSchemas(
            expression,
            { inputSchema: '#old', outputSchema: '#oldOut' },
            { inputSchema: '#new', outputSchema: '#oldOut' }
        );
        const items = (expression.variables[0] as any).items;
        expect(changed).toBeTrue();
        expect(items[0].schema).toBe('');
        expect(items[0].field).toBe('x');
        expect(items[1].schema).toBe('');
        expect(items[2].schema).toBe('#other');
        expect((expression.outputs[0] as any).items[0].schema).toBe('#oldOut');
    });

    it('resets output links when the output schema changes', () => {
        const expression = build();
        resetMathLinkSchemas(
            expression,
            { inputSchema: '#old', outputSchema: '#oldOut' },
            { inputSchema: '#old', outputSchema: '#newOut' }
        );
        expect((expression.outputs[0] as any).items[0].schema).toBe('');
        expect((expression.variables[0] as any).items[0].schema).toBe('#old');
    });

    it('does nothing when schemas are unchanged or expression is missing', () => {
        const expression = build();
        const same = { inputSchema: '#old', outputSchema: '#oldOut' };
        expect(resetMathLinkSchemas(expression, same, same)).toBeFalse();
        expect(resetMathLinkSchemas(null, same, { ...same, inputSchema: '#n' })).toBeFalse();
    });
});
