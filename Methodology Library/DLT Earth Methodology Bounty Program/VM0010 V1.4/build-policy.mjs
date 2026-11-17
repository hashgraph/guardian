/**
 * Builds the VM0010 slice artifact VM0010.policy from the sources in this folder.
 *
 * Zero dependencies: minimal ZIP reader/writer over node:zlib. No new package
 * and no existing workspace package.json is touched.
 *
 * Container layout matches the repository precedents (all .policy files in the
 * repo share it): policy.json at the root plus artifacts/, schemas/,
 * systemSchemas/, tokens/, tools/, formulas/, tags/, tests/.
 *
 * systemSchemas/ are copied verbatim from the closest published scope-14
 * reference,
 *   Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy
 * because Guardian requires them for a policy container to load.
 *
 * NOTE: this folder already contains a tracked file, readme.md, which this
 * builder neither reads nor writes.
 *
 * Usage: node build-policy.mjs
 */

import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(HERE, 'VM0010.policy');
const VM0033 = join(REPO, 'Methodology Library', 'Verra', 'Verified Carbon Standard (VCS)', 'VM0033', 'VM0033.policy');

// ------------------------------------------------------------------ crc32

const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

// ------------------------------------------------------------------ zip read

function readZip(buf) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not a zip: no end-of-central-directory record');

    const count = buf.readUInt16LE(eocd + 10);
    let ptr = buf.readUInt32LE(eocd + 16);
    const out = new Map();

    for (let i = 0; i < count; i++) {
        if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('bad central directory header');
        const method = buf.readUInt16LE(ptr + 10);
        const compSize = buf.readUInt32LE(ptr + 20);
        const nameLen = buf.readUInt16LE(ptr + 28);
        const extraLen = buf.readUInt16LE(ptr + 30);
        const commentLen = buf.readUInt16LE(ptr + 32);
        const localOff = buf.readUInt32LE(ptr + 42);
        const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

        const dataStart = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
        const body = buf.subarray(dataStart, dataStart + compSize);

        if (method === 8) out.set(name, inflateRawSync(body));
        else if (method === 0) out.set(name, Buffer.from(body));
        else throw new Error(`unsupported compression method ${method} for ${name}`);

        ptr += 46 + nameLen + extraLen + commentLen;
    }
    return out;
}

// ------------------------------------------------------------------ zip write

function buildZip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const { name, data } of entries) {
        const nameBuf = Buffer.from(name, 'utf8');
        const deflated = deflateRawSync(data, { level: 9 });
        const useDeflate = deflated.length < data.length;
        const body = useDeflate ? deflated : data;
        const method = useDeflate ? 8 : 0;
        const crc = crc32(data);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(method, 8);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(body.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);

        locals.push(local, nameBuf, body);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(method, 10);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(body.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt32LE(offset, 42);

        centrals.push(central, nameBuf);
        offset += local.length + nameBuf.length + body.length;
    }

    const centralBuf = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralBuf.length, 12);
    end.writeUInt32LE(offset, 16);

    return Buffer.concat([...locals, centralBuf, end]);
}

// ------------------------------------------------------------------ build

const config = JSON.parse(readFileSync(join(HERE, 'policy.config.json'), 'utf8'));
const spec = config.policy;

const LOGIC_FILES = [
    'logic/calculate-c-fuel.js',
    'logic/calculate-carbon-stocks-811.js',
    'logic/calculate-rsd-812.js',
    'logic/calculate-infra-812.js',
    'logic/calculate-extracted-813.js',
    'logic/calculate-deadwood-812.js',
    'logic/calculate-woodproducts-813.js',
    'logic/calculate-project-stocks-821.js',
    'logic/calculate-hauling-fuel-814.js',
    'logic/calculate-net-benefits-84.js',
    'logic/calculate-vcus-86.js',
    'logic/calculate-transport-fuel-814.js',
    'logic/calculate-processing-energy-814.js',
    'logic/calculate-non-co2-emission-factor.js',
    'logic/calculate-fuel-factors.js',
    'logic/calculate-biomass-factors.js',
    'logic/calculate-uncertainty-85.js',
    'logic/calculate-fire-disturbance-822.js',
    'logic/calculate-plot-volume-811.js',
    'logic/project-hub-project-description-custom.js',
];
const logicByFile = new Map(LOGIC_FILES.map((f) => [f, readFileSync(join(HERE, f), 'utf8')]));

const schemaDir = join(HERE, 'schemas');
const schemaEntries = [];
const iriByName = new Map();

for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
    const name = file.replace(/\.schema\.json$/, '');
    const iri = `#${name}`;
    const doc = JSON.parse(readFileSync(join(schemaDir, file), 'utf8'));
    doc.iri = iri;
    doc.system = false;
    doc.entity = 'VC';
    doc.contextURL = `schema:${name}`;
    if (doc.document) doc.document.$id = iri;
    iriByName.set(name, iri);
    schemaEntries.push({ name: `schemas/${iri}.json`, data: Buffer.from(JSON.stringify(doc), 'utf8') });
}

const reference = readZip(readFileSync(VM0033));
const systemSchemaEntries = [...reference.entries()]
    .filter(([name]) => name.startsWith('systemSchemas/') && name.endsWith('.json'))
    .map(([name, data]) => ({ name, data }));

function resolveBlock(node) {
    const copy = { ...node };
    delete copy._comment;

    if (copy.schemaFile) {
        copy.schema = `#${copy.schemaFile.replace(/^schemas\//, '').replace(/\.schema\.json$/, '')}`;
        delete copy.schemaFile;
    }
    if (copy.outputSchemaFile) {
        copy.outputSchema = `#${copy.outputSchemaFile.replace(/^schemas\//, '').replace(/\.schema\.json$/, '')}`;
        delete copy.outputSchemaFile;
    }
    if (copy.expressionFile) {
        const expression = logicByFile.get(copy.expressionFile);
        if (expression === undefined) throw new Error(`unknown expressionFile ${copy.expressionFile}`);
        copy.expression = expression;
        delete copy.expressionFile;
    }
    if (typeof copy.schema === 'string' && !copy.schema.startsWith('#')) {
        const iri = iriByName.get(copy.schema);
        if (!iri) throw new Error(`unknown schema ${copy.schema}`);
        copy.schema = iri;
    }
    if (Array.isArray(copy.children)) copy.children = copy.children.map(resolveBlock);
    return copy;
}

const policy = {
    uuid: 'vm0010-0000-4000-8000-000000000001',
    name: spec.name,
    description: spec.description,
    topicDescription: spec.topicDescription,
    creator: 'did:hedera:testnet:0.0.0',
    owner: 'did:hedera:testnet:0.0.0',
    policyRoles: spec.policyRoles,
    policyNavigation: [
        { role: 'NO_ROLE', steps: [] },
        { role: 'Project Proponent', steps: [] },
        { role: 'VVB', steps: [] },
    ],
    policyGroups: [],
    policyTopics: spec.policyTopics,
    policyTokens: [],
    policyDocumentation: [],
    topicId: '0.0.0',
    instanceTopicId: null,
    synchronizationTopicId: null,
    commentsTopicId: null,
    policyTag: null,
    codeVersion: spec.codeVersion,
    hash: null,
    importantParameters: { atValidation: '', monitored: '' },
    typicalProjects: '',
    applicabilityConditions: '',
    categories: ['', '', ''],
    categoriesExport: [],
    detailsUrl: '',
    tools: [],
    restoreTopicId: null,
    availability: spec.availability,
    locationType: spec.locationType,
    actionsTopicId: null,
    recordsTopicId: null,
    autoRecordSteps: false,
    config: resolveBlock(spec.config),
};

const EMPTY_DIRS = ['tokens/.gitkeep', 'tools/.gitkeep', 'formulas/.gitkeep', 'tags/.gitkeep', 'tests/.gitkeep'];

const entries = [
    { name: 'policy.json', data: Buffer.from(JSON.stringify(policy), 'utf8') },
    { name: 'artifacts/metadata.json', data: Buffer.from('{}', 'utf8') },
    ...schemaEntries,
    ...systemSchemaEntries,
    ...EMPTY_DIRS.map((name) => ({ name, data: Buffer.alloc(0) })),
];

const buf = buildZip(entries);
writeFileSync(OUT, buf);

console.log(`wrote ${relative(REPO, OUT)}`);
console.log(`  ${buf.length} bytes, ${entries.length} entries`);
console.log(`  schemas      : ${[...iriByName.keys()].join(', ')}`);
console.log(`  systemSchemas: ${systemSchemaEntries.length} copied from VM0033.policy`);
