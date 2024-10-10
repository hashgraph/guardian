
/**
 * Search Utils
 */
export class SearchUtils {
    /**
     * Compare block path
     * @param a
     * @param b
     * @public
     * @static
     */
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

    /**
     * Aggregate total rate
     * @param rates - rates (array)
     * @param k - coefficients (array)
     * @public
     * @static
     */
    public static calcTotalRates(rates: number[], k: number[]): number {
        if (rates.length === 0 || rates.length !== k.length) {
            return 0;
        }
        let total = 0;
        let length = 0;
        for (let i = 0; i < rates.length; i++) {
            total = total + (rates[i] * k[i]);
            length = length + k[i];
        }
        return Math.floor(total / length);
    }
}