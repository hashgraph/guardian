/**
 * Model helper
 */
export class ModelHelper {
    /**
     * Check version format
     * @param version
     */
    public static checkVersionFormat(version: string) {
        return (/^[\d]+([\\.][\d]+){0,2}$/.test(version));
    }

    /**
     * Compare versions
     * @param v1
     * @param v2
     */
    public static versionCompare(v1: string, v2: string) {
        if (!v2) {
            return 1;
        }
        const v1parts = v1.split('.').map(e=>parseInt(e, 10));
        const v2parts = v2.split('.').map(e=>parseInt(e, 10));
        for (let i = 0; i < v1parts.length; ++i) {
            if (v2parts.length === i) {
                return 1;
            }
            if (v1parts[i] === v2parts[i]) {
                continue;
            }
            else if (v1parts[i] > v2parts[i]) {
                return 1;
            }
            else {
                return -1;
            }
        }
        if (v1parts.length !== v2parts.length) {
            return -1;
        }
        return 0;
    }
}
