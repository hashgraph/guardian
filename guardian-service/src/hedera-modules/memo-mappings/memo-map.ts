/**
 * Memo map base
 */
export class MemoMap {
    /**
     * Parse memo string
     * @param safetyParse Throws errors if flag is false
     * @param memo Memo string
     * @param memoObj Memo parameters object
     * @returns Parsed memo
     */
    public static parseMemo(safetyParse: boolean, memo: string, memoObj?: any): string {
        if (!memo) {
            if (!safetyParse) {
                throw new Error('Memo string is empty');
            }
            return '';
        }
        return memo.replace(
            /\${([A-Za-z0-9.]+)}/g,
            (_, placeholderWithoutDelimiters) => {
                let value;
                try {
                    value = placeholderWithoutDelimiters
                        .split('.')
                        .reduce((p, prop) => p[prop], memoObj);
                }
                catch {
                    value = '';
                }
                if (!value && !safetyParse) {
                    throw new Error(`Parameter ${placeholderWithoutDelimiters} in memo object is not defined`);
                }
                return value || '';
            }
        );
    }
}
