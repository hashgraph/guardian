import * as mathjs from 'mathjs';

export class Expression {
    public readonly name: string;
    public readonly formulae: string;
    public readonly symbols: Set<string>;
    public readonly functions: Map<string, string[]>;
    public readonly ranges: Map<string, string[]>;

    public validated: boolean;
    public transformed: string;

    constructor(name: string, formulae: string) {
        this.name = name;
        this.formulae = formulae;
        this.symbols = new Set<string>();
        this.functions = new Map<string, string[]>();
        this.ranges = new Map<string, string[]>();
    }

    public parse(): void {
        const tree = mathjs.parse(this.formulae);
        this.parseNodes(tree);
        const transformed = tree.transform(
            (node: mathjs.MathNode, path: string, parent: mathjs.MathNode) => {
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

    private parseNodes(node: mathjs.MathNode): void {
        if (node.type === 'SymbolNode') {
            this.symbols.add(node.name);
        } else if (node.type === 'FunctionNode') {
            const name = node.fn.name;
            const templates = this.functions.get(name) || [];
            templates.push(node.toString());
            this.functions.set(name, templates);
            for (const arg of node.args) {
                this.parseNodes(arg);
            }
        } else if (node.type === 'OperatorNode') {
            for (const arg of node.args) {
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
            for (let i = min; i <= max; i++) {
                result.push(`${startCol}${i}`);
            }
            return result;
        } catch (error) {
            throw new Error('Invalid range');
        }
    }
}
