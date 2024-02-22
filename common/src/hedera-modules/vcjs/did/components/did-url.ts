/**
 * DID URL utils
 */
export class DidURL {
    /**
     * Get did controller
     * @param {string} didPath - full DID URL
     * @returns {string} - controller DID
     * @public
     * @static
     */
    public static getController(didPath: string): string {
        if (!didPath || typeof didPath !== 'string') {
            throw new Error('DID cannot be ' + didPath);
        }
        return didPath.split(/[\#\?\/]/)[0];
    }

    /**
     * Get did params
     * @param {string} didPath - full DID URL
     * @returns {string} - DID URL params
     * @public
     * @static
     */
    public static getPath(didPath: string): string {
        if (!didPath || typeof didPath !== 'string') {
            throw new Error('DID cannot be ' + didPath);
        }
        const items = didPath.split(/[\#\?\/]/);
        if (items.length > 1) {
            return items.slice(1).join('');
        }
        return null;
    }
}