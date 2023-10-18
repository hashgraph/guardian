
/**
 * Search Utils
 */
export class SearchUtils {
    public static comparePath(a: number[], b: number[]): number {
        let i = 0;
        while (i < a.length && i < b.length) {
            if (a[i] !== b[i]) {
                return a[i] > b[i] ? 1 : -1;
            }
            i++;
        }
        return a.length > b.length ? 1 : -1;
    }
}