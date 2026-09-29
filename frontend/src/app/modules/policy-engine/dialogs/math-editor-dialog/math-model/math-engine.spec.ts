import { MathEngine } from './math-engine';

describe('MathEngine table output validation', () => {
    function engineWith(rows: Record<string, string>[]): MathEngine {
        const engine = new MathEngine();
        engine.addVariable('x', 'doc.a').update();
        const output = engine.addOutput();
        output.field = 'results';
        output.rows = rows;
        output.update();
        return engine;
    }

    it('accepts cells that name known variables', () => {
        expect(engineWith([{ a: 'x', b: '' }]).validate()).toBeNull();
    });

    it('rejects a cell that names an unknown variable', () => {
        const engine = engineWith([{ a: 'missing' }]);
        expect(engine.validate()).toEqual(['outputs', engine.outputs.pages[0].id]);
        expect(engine.outputs.getItems()[0].error).toBe('Unknown variable: missing');
    });

    it('rejects a cell that names a function', () => {
        const engine = engineWith([{ a: 'size' }]);
        expect(engine.validate()).toEqual(['outputs', engine.outputs.pages[0].id]);
        expect(engine.outputs.getItems()[0].error).toBe('Invalid value');
    });

    it('rejects a cell that is not a variable name', () => {
        const engine = engineWith([{ a: '1x' }]);
        expect(engine.validate()).toEqual(['outputs', engine.outputs.pages[0].id]);
    });
});
