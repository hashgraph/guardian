export class ContextHelper {
    private static readonly types: string[] = [
        'Polygon',
        'Point',
        'MultiPolygon',
        'MultiPoint',
        'MultiLineString',
        'LineString',
        'GeometryCollection',
        'GeoJSON',
        '#GeoJSON',
        'FeatureCollection',
        'Feature',
        'Geometry',
        'number',
        'string',
        'object',
        'geometry',
        'array',
    ];

    private static addContext(context: any, contexts: Set<string>) {
        if (typeof context === 'string') {
            contexts.add(context);
        } else if (Array.isArray(context)) {
            for (const c of context) {
                ContextHelper.addContext(c, contexts);
            }
        }
    }

    private static _clearContext(item: any, contexts: Set<string>) {
        if (typeof item === 'object') {
            if (Array.isArray(item)) {
                for (const i of item) {
                    ContextHelper._clearContext(i, contexts);
                }
            } else {
                if (!ContextHelper.types.includes(item.type)) {
                    delete item.type;
                }
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

    public static clearContext(vc: any) {
        if (vc.credentialSubject) {
            if (Array.isArray(vc.credentialSubject)) {
                for (const subject of vc.credentialSubject) {
                    const contexts = new Set<string>();
                    const type = subject.type;
                    ContextHelper._clearContext(subject, contexts);
                    const context = Array.from(contexts);
                    if (context && context.length) {
                        subject['@context'] = context;
                    }
                    if (type) {
                        subject.type = type;
                    }

                }
            } else {
                const contexts = new Set<string>();
                const type = vc.credentialSubject.type;
                ContextHelper._clearContext(vc.credentialSubject, contexts);
                const context = Array.from(contexts);
                if (context && context.length) {
                    vc.credentialSubject['@context'] = context;
                }
                if (type) {
                    vc.credentialSubject.type = type;
                }
            }
        }
        return vc;
    }
}