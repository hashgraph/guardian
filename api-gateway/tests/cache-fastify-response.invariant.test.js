import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A @UseCache() handler that manages its own response via @Response()/@Res
// hangs on a cache hit unless it passes { isFastify: true }: the hit never runs
// the handler, and without the flag the interceptor returns a value Fastify's
// manual-response mode drops, so reply.send() is never called.

const SERVICE_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../src/api/service'
);

function matchParen(src, open) {
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function findViolations(src, file) {
    const out = [];
    const re = /@UseCache\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
        const argOpen = m.index + m[0].length - 1;
        const argClose = matchParen(src, argOpen);
        if (argClose < 0) continue;
        const isFastify = /isFastify\s*:\s*true/.test(src.slice(argOpen + 1, argClose));

        const rest = src.slice(argClose);
        const sigM = rest.match(/async\s+([A-Za-z0-9_]+)\s*\(/);
        if (!sigM) continue;
        const paramOpen = argClose + sigM.index + sigM[0].length - 1;
        const params = src.slice(paramOpen + 1, matchParen(src, paramOpen));
        const usesRes = /@Response\s*\(|@Res\s*\(/.test(params);

        if (usesRes && !isFastify) {
            out.push(`${file}::${sigM[1]}`);
        }
    }
    return out;
}

describe('@UseCache Fastify response contract', () => {
    const files = fs.readdirSync(SERVICE_DIR).filter((f) => f.endsWith('.ts'));

    it('has service sources to scan', () => {
        assert.ok(files.length > 0);
    });

    it('never pairs @UseCache (without isFastify:true) with a @Response()/@Res handler', () => {
        const violations = files.flatMap((f) =>
            findViolations(fs.readFileSync(path.join(SERVICE_DIR, f), 'utf8'), f)
        );
        assert.deepEqual(
            violations,
            [],
            `Cache hits on these @Response() handlers never call res.send() and hang:\n` +
                violations.map((v) => `  - ${v}`).join('\n')
        );
    });
});
