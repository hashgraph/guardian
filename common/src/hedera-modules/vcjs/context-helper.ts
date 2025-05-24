export class ContextHelper {
    private static addContext(context: any, contexts: Set<string>) {
        if (typeof context === 'string') {
            contexts.add(context);
        } else if (Array.isArray(context)) {
            for (const c of context) {
                ContextHelper.addContext(c, contexts);
            }
        }
    }

    private static _clearContext = (item: any, contexts: Set<string>) => {
        if (typeof item === 'object') {
            if (Array.isArray(item)) {
                for (const i of item) {
                    ContextHelper._clearContext(i, contexts);
                }
            } else {
                if (item['@context']) {
                    ContextHelper.addContext(item['@context'], contexts);
                    delete item['@context'];
                }
                const props = Object.keys(item);
                for (const prop of props) {
                    ContextHelper._clearContext(item[prop], contexts);
                }
            }
        } else {
            return;
        }
    }

    public static clearContext = (vc: any) => {
        const contexts = new Set<string>();
        ContextHelper._clearContext(vc, contexts);
        vc['@context'] = Array.from(contexts);
        return vc;
    }
}
