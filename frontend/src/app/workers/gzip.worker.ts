import { gzip, ungzip } from 'pako';

function decodeUtf8(bytes: Uint8Array): string {
    return new TextDecoder('utf-8').decode(bytes);
}

function encodeUtf8(value: string): Uint8Array {
    return new TextEncoder().encode(value);
}

function splitCsvRespectingQuotes(line: string, delimiter: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && i + 1 < line.length && line[i + 1] === '"') {
                cur += '"';
                i += 1;
            } else {
                inQ = !inQ;
            }
            continue;
        }
        if (!inQ && ch === delimiter) {
            out.push(cur);
            cur = '';
            continue;
        }
        cur += ch;
    }
    out.push(cur);
    return out;
}

function detectDelimiter(headerLine: string): string {
    const candidates = [',', ';', '\t', '|'];
    let best = ',';
    let bestCount = -1;
    for (const d of candidates) {
        const c = splitCsvRespectingQuotes(headerLine, d).length - 1;
        if (c > bestCount) {
            best = d;
            bestCount = c;
        }
    }
    return best;
}

function sortCsvLinesLexicographically(text: string): string {
    const idx = text.indexOf('\n');
    if (idx < 0) {
        return text;
    }
    const headerLine = text.slice(0, idx);
    const body = text.slice(idx + 1);
    const lines = body.length ? body.split('\n') : [];
    const filtered = lines.filter(l => l.length > 0);
    filtered.sort((a, b) => {
        if (a === b) return 0;
        if (a < b) return -1;
        return 1;
    });
    const out = [headerLine, ...filtered].join('\n');
    return out;
}

self.onmessage = async (e: MessageEvent) => {
    const payload = e.data as any;
    const { id, op, file, name, bytes } = payload;
    try {
        if (op === 'gzip') {
            if (!file) throw new Error('file is required');
            const input = new Uint8Array(await file.arrayBuffer());
            const gz = gzip(input, { level: 9 });
            const out = new File(
                [gz],
                (name || 'file.csv').replace(/\.csv$/i, '') + '.csv.gz',
                { type: 'application/gzip' }
            );
            (self as any).postMessage({ id, ok: true, file: out });
            return;
        }
        if (op === 'gunzipText') {
            const buffer = bytes || (file ? await file.arrayBuffer() : undefined);
            if (!buffer) throw new Error('bytes or file is required');
            const u8 = new Uint8Array(buffer);
            const dec = ungzip(u8);
            const text = decodeUtf8(dec);
            (self as any).postMessage({ id, ok: true, text });
            return;
        }
        if (op === 'gzipSortLex') {
            if (!file) throw new Error('file is required');
            const raw = decodeUtf8(new Uint8Array(await file.arrayBuffer()));
            const sorted = sortCsvLinesLexicographically(raw);
            const gz = gzip(encodeUtf8(sorted), { level: 9 });
            const out = new File(
                [gz],
                (name || 'file.csv').replace(/\.csv(\.\w+)?$/i, '') + '.csv.gz',
                { type: 'application/gzip' }
            );
            (self as any).postMessage({ id, ok: true, file: out });
            return;
        }
        throw new Error('unknown op');
    } catch (err: any) {
        (self as any).postMessage({ id, ok: false, error: err?.message || String(err) });
    }
};
