/**
 * Test helpers: read a Guardian .policy container and execute embedded
 * customLogicBlock / dataTransformationAddon expressions in a sandbox.
 *
 * Zero dependencies. The ZIP reader is intentionally a second, independent
 * implementation from the one in build-policy.mjs, so a bug in the writer
 * cannot mask itself.
 */

import { inflateRawSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const SLICE_DIR = join(HERE, '..');
export const REPO_ROOT = join(SLICE_DIR, '..', '..', '..');

const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();

export function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

/** Read every entry out of a ZIP buffer. Verifies CRC-32 of each entry. */
export function readZip(buf) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not a zip');

    const count = buf.readUInt16LE(eocd + 10);
    let ptr = buf.readUInt32LE(eocd + 16);
    const out = new Map();

    for (let i = 0; i < count; i++) {
        if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('bad central header');
        const method = buf.readUInt16LE(ptr + 10);
        const crc = buf.readUInt32LE(ptr + 16);
        const compSize = buf.readUInt32LE(ptr + 20);
        const uncompSize = buf.readUInt32LE(ptr + 24);
        const nameLen = buf.readUInt16LE(ptr + 28);
        const extraLen = buf.readUInt16LE(ptr + 30);
        const commentLen = buf.readUInt16LE(ptr + 32);
        const localOff = buf.readUInt32LE(ptr + 42);
        const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

        const dataStart = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
        const body = buf.subarray(dataStart, dataStart + compSize);
        const data = method === 8 ? inflateRawSync(body) : Buffer.from(body);

        if (data.length !== uncompSize) throw new Error(`size mismatch for ${name}`);
        if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`);

        out.set(name, data);
        ptr += 46 + nameLen + extraLen + commentLen;
    }
    return out;
}

export function loadSlicePolicy() {
    const entries = readZip(readFileSync(join(SLICE_DIR, 'ACM0010.policy')));
    const policy = JSON.parse(entries.get('policy.json').toString('utf8'));
    // Schemas as packaged in the artifact, keyed by their IRI (e.g. "#project-description").
    const schemas = new Map();
    for (const [name, data] of entries) {
        if (!name.startsWith('schemas/') || !name.endsWith('.json')) continue;
        const iri = name.slice('schemas/'.length, -'.json'.length);
        schemas.set(iri, JSON.parse(data.toString('utf8')));
    }
    return { entries, policy, schemas };
}

export function loadReferencePolicy(relativePath) {
    const entries = readZip(readFileSync(join(REPO_ROOT, relativePath)));
    return { entries, policy: JSON.parse(entries.get('policy.json').toString('utf8')) };
}

/** Depth-first walk over a Guardian block tree. */
export function walkBlocks(node, visit, path = 'config') {
    if (!node || typeof node !== 'object') return;
    if (node.blockType) visit(node, path);
    if (Array.isArray(node.children)) {
        node.children.forEach((c, i) => walkBlocks(c, visit, `${path}/${c.tag || c.blockType}[${i}]`));
    }
}

export function collectBlockTypes(root) {
    const types = new Set();
    walkBlocks(root, (n) => types.add(n.blockType));
    return types;
}

/**
 * Build the set of blockTypes actually used anywhere in the repository's
 * *.policy bundles. Used to prove that block types appearing in this slice are
 * real Guardian block types rather than invented ones.
 */
export function repoBlockTypeCensus() {
    const root = join(SLICE_DIR, '..', '..', '..', 'Methodology Library');
    const census = new Set();
    const stack = [root];
    while (stack.length) {
        const dir = stack.pop();
        let items;
        try {
            items = readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const item of items) {
            const full = join(dir, item.name);
            if (item.isDirectory()) { stack.push(full); continue; }
            if (!item.name.endsWith('.policy')) continue;
            try {
                const zipped = readZip(readFileSync(full));
                const raw = zipped.get('policy.json');
                if (!raw) continue;
                const parsed = JSON.parse(raw.toString('utf8'));
                walkBlocks(parsed.config, (n) => census.add(n.blockType));
            } catch {
                // A malformed or non-ZIP policy must not break the census.
            }
        }
    }
    return census;
}

/**
 * Execute an embedded Guardian expression in a sandbox and capture the
 * value handed to done(). Mirrors the Guardian customLogicBlock contract.
 */
export function runExpression(expression, { documents = [], sources = [] } = {}) {
    let output = Symbol('not-called');
    const context = {
        documents,
        sources,
        done: (value) => { output = value; return value; },
        Math,
        Number,
        Array,
        Object,
        String,
        Boolean,
        Error,
        JSON,
        isFinite,
        parseInt,
        parseFloat,
    };
    createContext(context);
    runInContext(expression, context, { timeout: 5000 });
    return output;
}

/** Wrap a credentialSubject payload the way Guardian delivers `documents`. */
export function asDocument(subject, type = 'VerraVCSProject') {
    return { document: { '@context': ['https://schema.org'], type: [type], credentialSubject: [subject] } };
}
