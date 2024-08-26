/**
 * Fix connection string
 * @param cs Connection string
 * @returns Fixed connection string
 */
export default function fixConnectionString(cs: string) {
    return /.+\:\/\/.+/.test(cs) ? cs : `mongodb://${cs}`;
}
