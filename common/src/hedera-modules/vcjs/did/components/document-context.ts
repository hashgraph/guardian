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

    /**
     * Get context object
     * @returns {string | string[] | null} - context
     * @public
     */
    public toObject(): string | string[] | null {
        if (this.context.length === 0) {
            return null;
        }
        if (this.context.length === 1) {
            return this.context[0];
        }
        return this.context.slice();
    }

    /**
     * Check context
     * @returns {boolean} - is empty
     * @public
     */
    public isEmpty(): boolean {
        return this.context.length === 0;
    }

    /**
     * Add new context
     * @param {string} context - new context
     * @public
     */
    public add(context: string) {
        if (this.context.indexOf(context) === -1) {
            this.context.push(context);
        }
    }

    /**
     * From context object
     * @param {string | string[] | null} context - context object
     * @returns {DocumentContext} - context
     * @public
     * @static
     */
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