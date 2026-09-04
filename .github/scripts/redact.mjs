#!/usr/bin/env node
/**
 * Shared secret scrubber for everything the E2E workflow publishes.
 *
 * A failing `cy.request` writes its whole request -- `authorization: Bearer <JWT>`
 * header included -- into the JUnit XML that mocha-junit-reporter produces, and the
 * same text ends up in the mochawesome per-spec JSONs and in the merged HTML report.
 * All of those are uploaded as artifacts and the XML is fed to the check-run action.
 * GitHub only masks values that came from `secrets.*`; these tokens are minted at
 * runtime, so nothing masks them for us.
 *
 * Usage:
 *   import { redact } from './redact.mjs'
 *
 *   node redact.mjs <path>...            rewrite files in place (recurses into dirs)
 *   node redact.mjs --check <path>...    exit 1 if anything still looks like a secret
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const JWT = '[REDACTED-JWT]';
const KEY = '[REDACTED-KEY]';
const VAL = '[REDACTED]';

// Only text formats. `assets/` holds the vendored JS/CSS of the mochawesome report
// and screenshots/videos are binary, so both are skipped.
const TEXT_EXTENSIONS = new Set(['.xml', '.json', '.html', '.log', '.txt', '.md']);
const SKIP_DIRS = new Set(['assets', 'node_modules', '.git', 'screenshots', 'videos']);

/**
 * Patterns applied first: they match the secret *value* itself, so they are immune to
 * how the surrounding document quotes or HTML-escapes things, and replacing them never
 * breaks the JSON/XML syntax around them.
 */
const VALUE_PATTERNS = [
    // JSON Web Tokens -- the header always starts `{"alg"` which base64url-encodes to `eyJ`
    [/\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g, JWT],
    // Hedera/Ed25519 keys in DER form, e.g. 302e020100300506032b657004220420<hex>
    [/\b302[ae]0201003005060(?:3|32)b657[0-9a-fA-F]{20,}/g, KEY],
    // raw 32-byte hex keys, with or without the 0x prefix
    [/\b0x[0-9a-fA-F]{64}\b/g, KEY],
    // PEM blocks (JWT_PRIVATE_KEY and friends)
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, KEY],
    // a Bearer token that is not a JWT
    [/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g, `Bearer ${VAL}`],
];

const SENSITIVE_KEYS = [
    'authorization',
    'password', 'newPassword', 'oldPassword', 'confirmPassword',
    'operatorKey', 'privateKey', 'private_key', 'secretKey', 'secret',
    'refreshToken', 'accessToken',
    'ipfsStorageApiKey', 'api[-_]?key',
    'jwt[-_]?private[-_]?key',
].join('|');

// Quotes show up raw (`"`), HTML-escaped (`&quot;`, in the JUnit XML) and
// backslash-escaped (`\"`, inside a JSON string), so all three forms are accepted.
const Q = '(?:&quot;|\\\\"|["\'])';
const KEY_PART = `${Q}?(?:${SENSITIVE_KEYS})${Q}?\\s*[:=]\\s*`;
const VALUE_PART = '(?:&quot;[\\s\\S]*?&quot;|\\\\"(?:[^"\\\\]|\\\\.)*?\\\\"|"[^"\\n]*"|\'[^\'\\n]*\'|[^\\s,;}\\]]+)';
const NAMED_PATTERN = new RegExp(`(${KEY_PART})(${VALUE_PART})`, 'gi');

/**
 * Keeps whatever wrapper the value had, so redacting a `.json` file leaves it parseable
 * -- report-summary.mjs reads those same files after this has run.
 */
function replaceKeepingQuotes(_match, keyPart, value) {
    if (value.startsWith('&quot;')) {
        return `${keyPart}&quot;${VAL}&quot;`;
    }
    if (value.startsWith('\\"')) {
        return `${keyPart}\\"${VAL}\\"`;
    }
    if (value.startsWith('"')) {
        return `${keyPart}"${VAL}"`;
    }
    if (value.startsWith("'")) {
        return `${keyPart}'${VAL}'`;
    }
    return `${keyPart}${VAL}`;
}

export function redact(text) {
    let out = text;
    for (const [pattern, replacement] of VALUE_PATTERNS) {
        out = out.replace(pattern, replacement);
    }
    return out.replace(NAMED_PATTERN, replaceKeepingQuotes);
}

/** Value-shaped leftovers only: the named-key rules are too broad to assert on. */
export function findLeaks(text) {
    const hits = [];
    for (const [pattern] of VALUE_PATTERNS.slice(0, 4)) {
        const match = text.match(new RegExp(pattern.source, pattern.flags));
        if (match) {
            hits.push(match[0].slice(0, 24));
        }
    }
    return hits;
}

function* walk(target) {
    let stat;
    try {
        stat = fs.statSync(target);
    } catch {
        return;
    }
    if (stat.isFile()) {
        yield target;
        return;
    }
    if (!stat.isDirectory()) {
        return;
    }
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                yield* walk(path.join(target, entry.name));
            }
        } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
            yield path.join(target, entry.name);
        }
    }
}

function main(argv) {
    const check = argv.includes('--check');
    const targets = argv.filter((a) => a !== '--check');

    if (targets.length === 0) {
        console.error('usage: redact.mjs [--check] <path>...');
        return 2;
    }

    let scanned = 0;
    let changed = 0;
    const leaking = [];

    for (const target of targets) {
        for (const file of walk(target)) {
            scanned += 1;
            const original = fs.readFileSync(file, 'utf8');

            if (check) {
                const hits = findLeaks(original);
                if (hits.length > 0) {
                    leaking.push(file);
                }
                continue;
            }

            const cleaned = redact(original);
            if (cleaned !== original) {
                fs.writeFileSync(file, cleaned);
                changed += 1;
            }
        }
    }

    if (check) {
        // Deliberately prints the file names only -- never the matched values.
        if (leaking.length > 0) {
            console.log(`::error::${leaking.length} of ${scanned} file(s) still contain secret-shaped values`);
            for (const file of leaking.slice(0, 20)) {
                console.log(`  ${file}`);
            }
            return 1;
        }
        console.log(`No secret-shaped values found in ${scanned} file(s).`);
        return 0;
    }

    console.log(`Redacted ${changed} of ${scanned} scanned file(s).`);
    return 0;
}

// Run as a CLI only when invoked directly; `redact` stays importable from
// e2e-tests/scripts/report-summary.mjs.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv.slice(2)));
}
