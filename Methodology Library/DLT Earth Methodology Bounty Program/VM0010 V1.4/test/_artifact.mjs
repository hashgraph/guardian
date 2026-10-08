/**
 * Test helpers: read a Guardian .policy container and execute embedded
 * customLogicBlock / dataTransformationAddon expressions in a sandbox.
 *
 * Zero dependencies. The ZIP reader is an independent implementation from the
 * one in build-policy.mjs, so a writer bug cannot mask itself.
 */

import { inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
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
    const entries = readZip(readFileSync(join(SLICE_DIR, 'VM0010.policy')));
    const policy = JSON.parse(entries.get('policy.json').toString('utf8'));
    // Schemas as packaged in the artifact, keyed by their IRI (e.g. "#project-description").
    const schemas = new Map();
    for (const [name, data] of entries) {
        if (!name.startsWith('schemas/') || !name.endsWith('.json')) continue;
        // Packaged as schemas/#<name>.json, so the slice already yields the IRI.
        const iri = name.slice('schemas/'.length, -'.json'.length);
        schemas.set(iri, JSON.parse(data.toString('utf8')));
    }
    return { entries, policy, schemas };
}

export function loadReferencePolicy(relativePath) {
    const entries = readZip(readFileSync(join(REPO_ROOT, relativePath)));
    return { entries, policy: JSON.parse(entries.get('policy.json').toString('utf8')) };
}

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

export function asDocument(subject, type = 'VerraVCSProject') {
    return { document: { '@context': ['https://schema.org'], type: [type], credentialSubject: [subject] } };
}
