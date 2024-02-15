/**
 * Did document context
 */
export class DocumentContext {
    /**
     * Context
     * @private
     */
    private readonly context: string[];

    constructor() {
        this.context = [];
    }

    public toObject(): string | string[] | null {
        if (this.context.length === 0) {
            return null;
        }
        if (this.context.length === 1) {
            return this.context[0];
        }
        return this.context.slice();
    }

    public isEmpty(): boolean {
        return this.context.length === 0;
    }

    public add(context: string) {
        if (this.context.indexOf(context) === -1) {
            this.context.push(context);
        }
    }

    public static from(context: string | string[] | null): DocumentContext {
        const result = new DocumentContext();
        if (context) {
            if (typeof context === 'string') {
                result.add(context);
            } else if (Array.isArray(context)) {
                for (const c of context) {
                    if (typeof c === 'string') {
                        result.add(c);
                    } else {
                        throw new Error('Invalid document context');
                    }
                }
            } else {
                throw new Error('Invalid document context');
            }
        }
        return result
    }
}