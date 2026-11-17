import { IDidComponents } from './types/did-components.js';

/**
 * DID base
 */
export class CommonDid {
    /**
     * DID prefix
     * @public
     * @static
     */
    public static readonly DID_PREFIX = 'did';

    /**
     * DID method separator
     * @public
     * @static
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
     * @returns {string} - DID Method
     * @public
     */
    public getMethod(): string {
        return this.method;
    }

    /**
     * Get identifier
     * @returns {string} - DID Identifier
     * @public
     */
    public getIdentifier(): string {
        return this.identifier;
    }

    /**
     * To string
     * @returns {string} - DID
     * @public
     */
    public toString(): string {
        return this.did;
    }

    /**
     * From
     * @param {string} did - DID
     * @returns {CommonDid} - DID
     * @public
     * @static
     */
    public static from(did: string): CommonDid {
        const { prefix, method, identifier } = CommonDid.parse(did);
        const result = new CommonDid();
        result.prefix = prefix;
        result.did = did;
        result.method = method;
        result.identifier = identifier;
        return result;
    }

    /**
     * Parse DID
     * @param {string} did - DID
     * @returns {IDidComponents} - DID Components
     * @public
     * @static
     */
    public static parse(did: string): IDidComponents {
        if (!did || typeof did !== 'string') {
            throw new Error('DID string cannot be null');
        }
        const parts = did.split(CommonDid.DID_METHOD_SEPARATOR);
        if (parts.length < 3 || parts[0] !== CommonDid.DID_PREFIX) {
            throw new Error('DID string is invalid: invalid did format.');
        }
        const prefix = parts[0];
        const method = parts[1];
        const identifier = parts.slice(2).join(CommonDid.DID_METHOD_SEPARATOR);
        return { prefix, method, identifier };
    }

    /**
     * Check DID type
     * @param {string} did - DID
     * @returns {boolean}
     * @public
     * @static
     */
    public static implement(did: string): boolean {
        if (!did || typeof did !== 'string') {
            return false;
        }
        const parts = did.split(CommonDid.DID_METHOD_SEPARATOR);
        if (parts[0] !== CommonDid.DID_PREFIX) {
            return false;
        }
        return true;
    }
}
