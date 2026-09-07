import * as mathjs from 'mathjs';

/**
 * Largest span a single range (A1:A9999) may expand to.
 *
 * parseRange builds one string per row, so an unbounded range from an uploaded
 * file is an allocation the process cannot survive: `=SUM(A1:A99999999)` asks for
 * 100 million strings. That is an OOM abort rather than an exception, so the
 * try/catch around the parse cannot contain it.
 *
 * Excel's own ceiling of 1,048,576 rows is an upper bound, not a safe one.
 */
export const MAX_RANGE_CELLS = 10_000;

/** Total cells one expression may reference across all of its ranges. */
export const MAX_EXPRESSION_CELLS = 50_000;

/** Raised when a formula asks for more cells than the caps above allow. */
export class RangeTooLargeError extends Error { }

export class Expression {
    public readonly name: string;
    public readonly formulae: string;
    public readonly symbols: Set<string>;
    public readonly functions: Map<string, string[]>;
    public readonly ranges: Map<string, string[]>;

    public validated: boolean;
    public transformed: string;

    private cellCount: number;

    constructor(name: string, formulae: string) {
        this.name = name;
        this.formulae = formulae;
        this.symbols = new Set<string>();
        this.functions = new Map<string, string[]>();
        this.ranges = new Map<string, string[]>();
        this.cellCount = 0;
    }

    public parse(): void {
        const tree = mathjs.parse(this.formulae) as mathjs.FunctionNode | mathjs.SymbolNode | mathjs.OperatorNode | mathjs.RangeNode;
        this.parseNodes(tree);
        const transformed = tree.transform(
            (node: mathjs.FunctionNode | mathjs.SymbolNode | mathjs.OperatorNode | mathjs.RangeNode, path: string, parent: mathjs.MathNode) => {
                if (node.type === 'RangeNode') {
                    return new mathjs.SymbolNode(
                        `${node.start.toString()}_${node.end.toString()}`
                    );
                }
                else {
                    return node;
                }
            }
        );
        this.transformed = transformed.toString();
    }

    private parseNodes(node: mathjs.FunctionNode | mathjs.SymbolNode | mathjs.OperatorNode | mathjs.RangeNode): void {
        if (node.type === 'SymbolNode') {
            this.symbols.add(node.name);
        } else if (node.type === 'FunctionNode') {
            const name = node.fn.name;
            const templates = this.functions.get(name) || [];
            templates.push(node.toString());
            this.functions.set(name, templates);
            for (const arg of node.args as mathjs.FunctionNode[]) {
                this.parseNodes(arg);
            }
        } else if (node.type === 'OperatorNode') {
            for (const arg of node.args as mathjs.OperatorNode[]) {
                this.parseNodes(arg);
            }
        } else if (node.type === 'RangeNode') {
            const start = node.start.toString();
            const end = node.end.toString();
            this.ranges.set(`${start}_${end}`, this.parseRange(start, end));
        }
    }

    private parseRange(start: string, end: string): string[] {
        try {
            const _start = start.match(/(?<col>([A-Z]|[a-z])+)(?<row>(\d)+)/);
            const _end = end.match(/(?<col>([A-Z]|[a-z])+)(?<row>(\d)+)/);
            const result: string[] = [];
            const startCol = _start.groups.col;
            const startRow = parseInt(_start.groups.row, 10);
            const endCol = _end.groups.col;
            const endRow = parseInt(_end.groups.row, 10);
            if (startCol !== endCol) {
                throw new Error('Invalid range');
            }
            const max = Math.max(startRow, endRow);
            const min = Math.min(startRow, endRow);

            const cells = max - min + 1;
            if (cells > MAX_RANGE_CELLS) {
                throw new RangeTooLargeError(
                    `Range ${start}:${end} spans ${cells} cells, more than the ${MAX_RANGE_CELLS} allowed.`
                );
            }
            this.cellCount += cells;
            if (this.cellCount > MAX_EXPRESSION_CELLS) {
                throw new RangeTooLargeError(
                    `Formula references ${this.cellCount} cells, more than the ${MAX_EXPRESSION_CELLS} allowed.`
                );
            }

            for (let i = min; i <= max; i++) {
                result.push(`${startCol}${i}`);
            }
            return result;
        } catch (error) {
            if (error instanceof RangeTooLargeError) {
                throw error;
            }
            throw new Error('Invalid range');
        }
    }
}
