/**
 * Proof 1: the VM0010 slice artifact loads and its structure is valid.
 *
 * Checks:
 *  - the .policy is a readable ZIP and every entry passes CRC-32
 *  - the container layout matches the repository precedent
 *  - systemSchemas are byte-identical to the scope-14 reference (VM0033)
 *  - policy.json has the keys Guardian expects
 *  - both schemas resolve to real files with consistent IRI wiring
 *  - every blockType used is a real Guardian blockType, cross-checked against a
 *    census of the .policy files in the repository
 *  - the tracked readme.md in this folder was not consumed or altered
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

import {
    SLICE_DIR,
    loadSlicePolicy,
    loadReferencePolicy,
    walkBlocks,
    collectBlockTypes,
} from './_artifact.mjs';

const { entries, policy } = loadSlicePolicy();

const VM0033 = join('Methodology Library', 'Verra', 'Verified Carbon Standard (VCS)', 'VM0033', 'VM0033.policy');
const VM0047 = join('Methodology Library', 'DLT Earth Methodology Bounty Program', 'VM0047 V1.1', 'VM0047_1.1.policy');

function repoBlockTypeCensus() {
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
                const buf = readFileSync(full);
                let eocd = -1;
                for (let i = buf.length - 22; i >= 0; i--) {
                    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
                }
                if (eocd < 0) continue;
                let ptr = buf.readUInt32LE(eocd + 16);
                const count = buf.readUInt16LE(eocd + 10);
                for (let n = 0; n < count; n++) {
                    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
                    const method = buf.readUInt16LE(ptr + 10);
                    const compSize = buf.readUInt32LE(ptr + 20);
                    const nameLen = buf.readUInt16LE(ptr + 28);
                    const extraLen = buf.readUInt16LE(ptr + 30);
                    const commentLen = buf.readUInt16LE(ptr + 32);
                    const localOff = buf.readUInt32LE(ptr + 42);
                    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
                    if (name === 'policy.json') {
                        const start = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
                        const body = buf.subarray(start, start + compSize);
                        const parsed = JSON.parse((method === 8 ? inflateRawSync(body) : Buffer.from(body)).toString('utf8'));
                        (function walk(n) {
                            if (!n || typeof n !== 'object') return;
                            if (n.blockType) census.add(n.blockType);
                            if (Array.isArray(n.children)) n.children.forEach(walk);
                        })(parsed.config);
                        break;
                    }
                    ptr += 46 + nameLen + extraLen + commentLen;
                }
            } catch { /* skip unreadable container */ }
        }
    }
    return census;
}

test('policy container opens and every entry passes CRC-32', () => {
    assert.ok(entries.get('policy.json'), 'policy.json must be present at the zip root');
    assert.ok(entries.size >= 14, `expected a complete container, got ${entries.size} entries`);
});

test('container layout matches the repository precedent', () => {
    const reference = loadReferencePolicy(VM0047);
    assert.ok(reference.policy, 'VM0047 reference policy parses');
    for (const dir of ['artifacts/', 'schemas/', 'systemSchemas/', 'tokens/', 'tools/', 'tags/', 'tests/', 'formulas/']) {
        const present = [...entries.keys()].some((n) => n.startsWith(dir));
        assert.ok(present, `container must contain ${dir}`);
    }
    const referenceDirs = [...reference.entries.keys()].map((n) => n.split('/')[0] + '/');
    const ours = [...entries.keys()].map((n) => n.split('/')[0] + '/');
    for (const dir of new Set(referenceDirs)) {
        assert.ok(ours.includes(dir), `missing directory present in VM0047: ${dir}`);
    }
});

test('systemSchemas are byte-identical to the scope-14 reference VM0033', () => {
    const reference = loadReferencePolicy(VM0033);
    const ours = [...entries.keys()].filter((n) => n.startsWith('systemSchemas/'));
    assert.ok(ours.length >= 10, `expected the Guardian system schemas, got ${ours.length}`);
    for (const name of ours) {
        const ref = reference.entries.get(name);
        assert.ok(ref, `${name} also present in VM0033.policy`);
        assert.equal(entries.get(name).toString('utf8'), ref.toString('utf8'), `${name} byte-identical`);
    }
});

test('policy.json carries the keys Guardian expects', () => {
    for (const key of [
        'uuid', 'name', 'description', 'codeVersion', 'availability', 'locationType',
        'policyRoles', 'policyTopics', 'policyTokens', 'tools', 'policyGroups',
        'policyDocumentation', 'config',
    ]) {
        assert.ok(key in policy, `policy.json missing ${key}`);
    }
    assert.deepEqual(policy.policyRoles.map((r) => r.name).sort(), ['Project Proponent', 'VVB']);
    assert.equal(policy.config.blockType, 'interfaceContainerBlock');
    assert.ok(/VM0010/.test(policy.name), 'policy name identifies VM0010');
});

test('both schemas are present and IRI-wired consistently', () => {
    const schemaEntries = [...entries.entries()].filter(([n]) => n.startsWith('schemas/'));
    assert.equal(schemaEntries.length, 22);
    const iris = new Set();
    for (const [name, data] of schemaEntries) {
        const doc = JSON.parse(data.toString('utf8'));
        const expectedIri = `#${name.replace('schemas/#', '').replace('.json', '')}`;
        assert.equal(doc.iri, expectedIri);
        assert.equal(doc.document.$id, expectedIri);
        assert.equal(doc.system, false);
        assert.equal(doc.entity, 'VC');
        iris.add(expectedIri);
    }
    walkBlocks(policy.config, (node) => {
        for (const key of ['schema', 'outputSchema']) {
            if (typeof node[key] === 'string') {
                assert.ok(iris.has(node[key]), `block ${node.tag} references missing schema ${node[key]}`);
                assert.ok(entries.has(`schemas/${node[key]}.json`), `missing file schemas/${node[key]}.json`);
            }
        }
    });
});

test('every blockType used is a real Guardian blockType', () => {
    const census = repoBlockTypeCensus();
    assert.ok(census.size > 30, `census should cover the repo, got ${census.size} types`);
    const used = collectBlockTypes(policy.config);
    for (const type of used) {
        assert.ok(census.has(type), `blockType "${type}" not found in any repository policy`);
    }
    assert.deepEqual([...used].sort(), [
        'customLogicBlock',
        'dataTransformationAddon',
        'documentsSourceAddon',
        'interfaceContainerBlock',
        'requestVcDocumentBlock',
    ]);
});

test('the Section 8.1.2 Eq (7) block is wired to the right schema and role', () => {
    let block = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.outputSchema === '#infra-812') block = node;
    });
    assert.ok(block, 'policy must contain the Eq (7) customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('embedded logic expressions survived packaging byte-for-byte', () => {
    const calc = readFileSync(join(SLICE_DIR, 'logic', 'calculate-c-fuel.js'), 'utf8');
    const hub = readFileSync(join(SLICE_DIR, 'logic', 'project-hub-project-description-custom.js'), 'utf8');
    const s811 = readFileSync(join(SLICE_DIR, 'logic', 'calculate-carbon-stocks-811.js'), 'utf8');
    const s812 = readFileSync(join(SLICE_DIR, 'logic', 'calculate-deadwood-812.js'), 'utf8');
    const s813 = readFileSync(join(SLICE_DIR, 'logic', 'calculate-woodproducts-813.js'), 'utf8');
    const rsd = readFileSync(join(SLICE_DIR, 'logic', 'calculate-rsd-812.js'), 'utf8');
    const infra = readFileSync(join(SLICE_DIR, 'logic', 'calculate-infra-812.js'), 'utf8');
    const extracted = readFileSync(join(SLICE_DIR, 'logic', 'calculate-extracted-813.js'), 'utf8');
    const embedded = [];
    walkBlocks(policy.config, (n) => { if (typeof n.expression === 'string') embedded.push(n.expression); });
    assert.equal(embedded.length, 20);
    assert.ok(embedded.includes(calc), 'calculate-c-fuel.js embedded verbatim');
    assert.ok(embedded.includes(hub), 'project-hub-project-description-custom.js embedded verbatim');
    assert.ok(embedded.includes(s811), 'calculate-carbon-stocks-811.js embedded verbatim');
    assert.ok(embedded.includes(s812), 'calculate-deadwood-812.js embedded verbatim');
    assert.ok(embedded.includes(s813), 'calculate-woodproducts-813.js embedded verbatim');
    assert.ok(embedded.includes(rsd), 'calculate-rsd-812.js embedded verbatim');
    assert.ok(embedded.includes(infra), 'calculate-infra-812.js embedded verbatim');
    assert.ok(embedded.includes(extracted), 'calculate-extracted-813.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-project-stocks-821.js'), 'utf8')), 'calculate-project-stocks-821.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-hauling-fuel-814.js'), 'utf8')), 'calculate-hauling-fuel-814.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-transport-fuel-814.js'), 'utf8')), 'calculate-transport-fuel-814.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-processing-energy-814.js'), 'utf8')), 'calculate-processing-energy-814.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-non-co2-emission-factor.js'), 'utf8')), 'calculate-non-co2-emission-factor.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-fuel-factors.js'), 'utf8')), 'calculate-fuel-factors.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-biomass-factors.js'), 'utf8')), 'calculate-biomass-factors.js embedded verbatim');
assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-uncertainty-85.js'), 'utf8')), 'calculate-uncertainty-85.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-fire-disturbance-822.js'), 'utf8')), 'calculate-fire-disturbance-822.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-plot-volume-811.js'), 'utf8')), 'calculate-plot-volume-811.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-net-benefits-84.js'), 'utf8')), 'calculate-net-benefits-84.js embedded verbatim');
    assert.ok(embedded.includes(readFileSync(join(SLICE_DIR, 'logic', 'calculate-vcus-86.js'), 'utf8')), 'calculate-vcus-86.js embedded verbatim');
  });

test('the tracked readme.md in this folder is untouched by the build', () => {
    const readme = readFileSync(join(SLICE_DIR, 'readme.md'));
    assert.equal(readme.length, 0, 'pre-existing tracked readme.md must remain byte-identical (0 bytes)');
    assert.ok(!entries.has('readme.md'), 'readme.md must not be packaged into the .policy');
});
