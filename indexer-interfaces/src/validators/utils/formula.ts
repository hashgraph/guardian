export abstract class FormulaEngine {
    private static mathjs: any;

    public static setMathEngine(math: any): void {
        FormulaEngine.mathjs = math
    }

    /**
     * Evaluate expressions
     * @param formula
     * @param scope
     */
    public static evaluate(formula: string, scope: any): any {
        if (!FormulaEngine.mathjs) {
            throw new Error('Math engine is not defined');
        }
        const ex = formula.trim().trim().replace(/^=/, '');
        // tslint:disable-next-line:only-arrow-functions
        return (function (_mathjs: any, _formula: string, _scope: any) {
            try {
                return _mathjs.evaluate(_formula, _scope);
            } catch (error) {
                return 'Incorrect formula';
            }
        }).call(null, FormulaEngine.mathjs, ex, scope);
    }

    public static GenerateUUIDv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            // tslint:disable-next-line:no-bitwise
            const r = Math.random() * 16 | 0;
            // tslint:disable-next-line:no-bitwise
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}