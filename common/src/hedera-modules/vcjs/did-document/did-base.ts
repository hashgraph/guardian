export interface DidComponents {
    readonly prefix: string;
    readonly method: string;
    readonly identifier: string;
}

export class DidBase {
    /**
     * DID prefix
     */
    public static readonly DID_PREFIX = 'did';

    /**
     * DID method separator
     */
    public static readonly DID_METHOD_SEPARATOR = ':';

    /**
     * Prefix
     * @protected
     */
    protected prefix: string;

    /**
     * Method
     * @protected
     */
    protected method: string;

    /**
     * Identifier
     * @protected
     */
    protected identifier: string;

    /**
     * Full did
     * @protected
     */
    protected did: string;

    protected constructor() {
    }

    /**
     * Get method
     */
    public getMethod(): string {
        return this.method;
    }

    /**
     * Get method
     */
    public getIdentifier(): string {
        return this.identifier;
    }

    /**
     * To string
     */
    public toString(): string {
        return this.did;
    }

    public static from(did: string): DidBase {
        const { prefix, method, identifier } = DidBase.parse(did);
        const result = new DidBase();
        result.prefix = prefix;
        result.did = did;
        result.method = method;
        result.identifier = identifier;
        return result;
    }

    /**
     * parse DID
     * @param did
     * @returns {DidComponents}
     */
    public static parse(did: string): DidComponents {
        if (!did || typeof did !== 'string') {
            throw new Error('DID string cannot be null');
        }
        const parts = did.split(DidBase.DID_METHOD_SEPARATOR);
        if (parts.length < 3 || parts[0] !== DidBase.DID_PREFIX) {
            throw new Error('DID string is invalid: invalid did format.');
        }
        const prefix = parts[0];
        const method = parts[1];
        const identifier = parts.slice(2).join(DidBase.DID_METHOD_SEPARATOR);
        return { prefix, method, identifier };
    }

    public static implement(did: string): boolean {
        if (!did || typeof did !== 'string') {
            return false;
        }
        const parts = did.split(DidBase.DID_METHOD_SEPARATOR);
        if (parts[0] !== DidBase.DID_PREFIX) {
            return false;
        }
        return true;
    }
}