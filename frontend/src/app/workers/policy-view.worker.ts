import * as yaml from 'js-yaml';

function objectToJson(root: any): string {
    return JSON.stringify(root, null, 2);
}

function objectToYaml(root: any): string {
    return yaml.dump(root, {
        indent: 4,
        lineWidth: -1,
        noRefs: false,
        noCompatMode: true
    });
}

self.onmessage = (e: MessageEvent) => {
    const { id, op, code } = (e.data || {}) as { id: string; op: string; code: string };
    try {
        let out = '';
        if (op === 'jsonToYaml') {
            out = objectToYaml(JSON.parse(code || 'null'));
        } else if (op === 'yamlToJson') {
            out = objectToJson(yaml.load(code || ''));
        } else {
            throw new Error('unknown op');
        }
        (self as any).postMessage({ id, ok: true, code: out });
    } catch (err: any) {
        (self as any).postMessage({ id, ok: false, error: err?.message || String(err) });
    }
};
