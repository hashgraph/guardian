import { Schema } from '@guardian/interfaces';

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
        if (item === undefined || item === null) {
            return;
        }
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

    public static setContext(vc: any, schema: Schema | null) {
        const context = vc['@context'];
        const items = ContextHelper._getItems(vc, '', []);
        for (const item of items) {
            if (schema) {
                const field = schema.getField(item.__path);
                if (field?.isRef) {
                    const fieldContext = field.context;
                    item.type = fieldContext?.type;
                    item['@context'] = context;
                }
            }
            delete item.__path;
        }
        return vc;
    }

    private static _getItems(root: any, key: string, items: any[]) {
        if (root === null || root === undefined) {
            return items;
        }
        if (Array.isArray(root)) {
            for (const item of root) {
                ContextHelper._getItems(item, key, items);
            }
            return items;
        } else if (typeof root === 'object') {
            root.__path = key;
            items.push(root);
            for (const prop of Object.keys(root)) {
                ContextHelper._getItems(root[prop], key ? `${key}.${prop}` : prop, items);
            }
            return items;
        } else {
            return items;
        }
    }

    public static clearEmptyProperties(vc: any): any {
        if (vc === null || vc === undefined) {
            return vc;
        }
        if (Array.isArray(vc)) {
            for (const prop of vc) {
                ContextHelper.clearEmptyProperties(prop);
            }
        } else if (typeof vc === 'object') {
            for (const key of Object.keys(vc)) {
                if (vc[key] === null || vc[key] === undefined) {
                    delete vc[key];
                } else {
                    ContextHelper.clearEmptyProperties(vc[key]);
                }
            }
            return vc;
        } else {
            return vc;
        }
    }
}