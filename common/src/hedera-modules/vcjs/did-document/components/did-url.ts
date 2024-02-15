export class DidURL {
    /**
     * Get did controller
     * @param didPath
     */
    public static getController(didPath: string): string {
        if (!didPath || typeof didPath !== 'string') {
            throw new Error('DID cannot be ' + didPath);
        }
        return didPath.split(/[\#\?\/]/)[0];
    }

    /**
     * Get did controller
     * @param didPath
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