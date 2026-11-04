/**
 * Regenerates the CDM methodology-library policy archives in place so that their
 * `tools/` entries are self-contained (v2: row + config + schemas + tags + messageId
 * + hash) instead of legacy messageId stubs that only resolve on the source network.
 *
 * Why: importing a policy archive whose tools are bare stubs makes the service re-fetch
 * each tool's consensus message by messageId; on any network other than the one the
 * tools were published to that fetch fails with MESSAGE_NOT_FOUND and the whole import
 * aborts. Embedding the full tool document makes the archive importable on every
 * network: the embedded import re-publishes the content locally, and nested refs of an
 * embedded tool resolve through the embedded registry (the archive itself) as long as
 * every transitively referenced tool is embedded too.
 *
 * Entry content comes from the library `.tool` exports under
 * Methodology Library/Clean Development Mechanism (CDM)/Tools; entry identity
 * (messageId, hash) comes from the references already present in the archives and in
 * the library exports - never from re-hashing the .tool bytes (they are not the
 * canonical publish bytes, so a re-hash would not match the source publish hash).
 *
 * The CDM ACM0001 archive (cdm1 pilot) additionally gets one sample record under
 * tests/: a single START row in the iRecFullFlow byte format.
 *
 * Usage: node utils/regenerate-cdm-archives.cjs [--check]
 *   --check  validates everything and reports, but writes no files.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');

const { PolicyImportExport } = require('../common/dist/import-export/policy.js');
const { ToolImportExport } = require('../common/dist/import-export/tool.js');
const { RecordImportExport } = require('../common/dist/import-export/record.js');
const { ImportExportUtils } = require('../common/dist/import-export/utils.js');
const { Hashing } = require('../common/dist/helpers/hashing.js');

const CDM_DIR = path.join(__dirname, '..', 'Methodology Library', 'Clean Development Mechanism (CDM)');
const TOOLS_DIR = path.join(CDM_DIR, 'Tools');

const CHECK_ONLY = process.argv.includes('--check');

// The pilot sample record's identity inside the archive; the import assigns a fresh
// uuid to the created test, so a fixed value keeps the archive byte-deterministic.
const SAMPLE_RECORD_UUID = '6f1e2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b';
// iRecFullFlow's START row: the did is opaque data to the engine, so it is not network-specific.
const SAMPLE_START_ROW = 'START,0,,did:hedera:testnet:6L2GtzfBZHA5CCxwdRUNfW83hV4bKsyGoSjoUa7B31EQ_0.0.6083652';

const failures = [];
const warnings = [];

function fail(message) {
    failures.push(message);
    console.error(`  FAIL  ${message}`);
}

function warn(message) {
    warnings.push(message);
    console.warn(`  WARN  ${message}`);
}

const sha256hex = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/**
 * Reads a zip (file path or buffer) into raw file entries (with their original dates)
 * and dir entries.
 */
async function readZip(source) {
    const data = typeof source === 'string' ? fs.readFileSync(source) : source;
    const zip = await JSZip.loadAsync(data);
    const files = [];
    const dirs = [];
    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) {
            dirs.push({ name, date: entry.date });
        } else {
            files.push({ name, data: await entry.async('nodebuffer'), date: entry.date });
        }
    }
    return { files, dirs };
}

/**
 * Serializes the archive. Kept entries keep their original dates; entries with a
 * deterministic flag (new tools entries, sample record) use the product's fixed date.
 */
async function writeZip(outPath, files, dirs) {
    const zip = new JSZip();
    for (const dir of dirs) {
        ImportExportUtils.addDeterministicZipDir(zip, dir.name.endsWith('/') ? dir.name.slice(0, -1) : dir.name);
    }
    for (const file of files) {
        const options = { ...ImportExportUtils.getDeterministicZipFileOptions() };
        if (file.date && !file.deterministic) {
            options.date = file.date;
        }
        zip.file(file.name, file.data, options);
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    if (!CHECK_ONLY) {
        fs.writeFileSync(outPath, buffer);
    }
    return buffer;
}

/**
 * Loads one library `.tool` export: the row, its schemas, its tags and its nested refs.
 */
async function loadToolLibraryFile(filePath) {
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    if (!zip.file('tool.json')) {
        throw new Error(`${filePath}: no tool.json`);
    }
    const row = JSON.parse(await zip.file('tool.json').async('string'));
    const schemas = [];
    const tags = [];
    const nestedRefs = [];
    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir || name === 'tool.json') {
            continue;
        }
        const text = await entry.async('string');
        if (name.startsWith('schemas/')) {
            schemas.push(JSON.parse(text));
        } else if (name.startsWith('tags/')) {
            tags.push(JSON.parse(text));
        } else if (name.startsWith('tools/')) {
            nestedRefs.push(JSON.parse(text));
        }
    }
    return { filePath, row, schemas, tags, nestedRefs };
}

/**
 * The identity fields the product strips before serializing an embedded entry.
 * Everything else in the row (name, description, creator, owner, version, tools refs,
 * codeVersion, ...) passes through exactly as the policy-zip writer would emit it.
 */
const IDENTITY_FIELDS = [
    '_id', 'id', 'uuid', 'topicId', 'status', 'tagsTopicId',
    'contentFileId', 'configFileId', 'createDate', 'updateDate',
    'messageId', 'hash',
];

/**
 * Builds the self-contained entry for one tool from a library export plus the
 * (messageId, hash) identity the referencing side carries.
 */
function buildToolEntry(libraryFile, messageId, hash) {
    const { row, schemas, tags } = libraryFile;
    const entry = { ...row };
    for (const field of IDENTITY_FIELDS) {
        delete entry[field];
    }
    entry.config = row.config;
    entry.schemas = schemas;
    entry.tags = Array.isArray(row.tags) ? row.tags : tags;
    entry.messageId = messageId;
    entry.hash = hash;
    return entry;
}

/** The policy-zip writer names entries `hash || name || tool-${index}`. */
function entryFileName(entry, index) {
    return entry.hash || entry.name || `tool-${index}`;
}

/**
 * Canonical re-serialization of an entry through the product's own writer: the smoke
 * test for "this entry is structurally importable" and for byte-stability. Not a hash
 * source - the entry hash comes from the referencing side.
 */
async function rezipEntryBytes(entry) {
    const components = {
        tool: { ...entry },
        tools: Array.isArray(entry.tools) ? entry.tools : [],
        schemas: entry.schemas || [],
        tags: entry.tags || [],
    };
    const zip = await ToolImportExport.generateZipFile(components);
    return Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }));
}

/**
 * The newest publish of a tool name is the one with the largest messageId timestamp
 * (message ids are `seconds.nanos`). The library exports are of the newest publish;
 * an archive pointing an older messageId at the same name re-uses the new content
 * under the old identity (decided for Tool 33 / CDM AMS-I.E).
 */
function newestPublishMid(name, midInfo) {
    let newest = undefined;
    for (const [mid, info] of midInfo) {
        if (!info.names.has(name)) {
            continue;
        }
        const timestamp = Number(mid.split('.')[0]);
        if (!Number.isFinite(timestamp)) {
            continue;
        }
        if (!newest || timestamp > Number(newest.split('.')[0])) {
            newest = mid;
        }
    }
    return newest;
}

async function main() {
    console.log(`CDM library: ${CDM_DIR}`);
    console.log(`mode: ${CHECK_ONLY ? 'CHECK ONLY (no files written)' : 'write in place'}`);

    // ------------------------------------------------------------------ library
    const library = new Map(); // tool name -> [export, ...]
    const toolFolders = fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    for (const folder of toolFolders) {
        const toolFiles = fs.readdirSync(path.join(TOOLS_DIR, folder))
            .filter((name) => name.endsWith('.tool'))
            .sort();
        for (const toolFile of toolFiles) {
            const filePath = path.join(TOOLS_DIR, folder, toolFile);
            const loaded = await loadToolLibraryFile(filePath);
            if (!loaded.row.name) {
                fail(`library ${filePath}: row has no name`);
                continue;
            }
            if (library.has(loaded.row.name)) {
                const known = library.get(loaded.row.name).map((item) => path.basename(item.filePath)).join(', ');
                fail(`library: duplicate exports for "${loaded.row.name}" (${known} and ${path.basename(filePath)})`);
            } else {
                library.set(loaded.row.name, [loaded]);
            }
        }
    }
    console.log(`library: ${library.size} tool names from ${toolFolders.length} folders`);

    // ------------------------------------------------------------------ archives
    const archiveFolders = fs.readdirSync(CDM_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'Tools' && !entry.name.startsWith('Work In Progress'))
        .map((entry) => entry.name)
        .sort();

    // Global view of every messageId referenced anywhere: one publish, one hash.
    const midInfo = new Map(); // mid -> { hashes: Set, names: Set }
    function registerMidRef(mid, { name, hash }) {
        if (!mid) {
            return;
        }
        let info = midInfo.get(mid);
        if (!info) {
            info = { hashes: new Set(), names: new Set() };
            midInfo.set(mid, info);
        }
        if (name) {
            info.names.add(name);
        }
        if (hash) {
            info.hashes.add(hash);
        }
    }

    const archives = [];
    for (const folder of archiveFolders) {
        const policyFiles = fs.readdirSync(path.join(CDM_DIR, folder)).filter((name) => name.endsWith('.policy'));
        if (!policyFiles.length) {
            console.log(`\n${folder}: no .policy file, skipped`);
            continue;
        }
        if (policyFiles.length > 1) {
            fail(`${folder}: more than one .policy file (${policyFiles.join(', ')}); refusing to guess`);
            continue;
        }
        const policyPath = path.join(CDM_DIR, folder, policyFiles[0]);
        const { files, dirs } = await readZip(policyPath);
        const byName = new Map(files.map((file) => [file.name, file]));
        const policyFile = byName.get('policy.json');
        if (!policyFile) {
            fail(`${folder}: archive has no policy.json`);
            continue;
        }
        const policy = JSON.parse(policyFile.data.toString('utf8'));
        const stubs = [];
        for (const file of files) {
            if (file.name.startsWith('tools/') && file.name !== 'tools/') {
                try {
                    stubs.push(JSON.parse(file.data.toString('utf8')));
                } catch (error) {
                    fail(`${folder}: unparseable tool stub ${file.name}: ${error.message}`);
                }
            }
        }
        const configMids = [...new Set(JSON.stringify(policy.config || {}).match(/1[0-9]{15}\.[0-9]{9}/g) || [])];
        const policyToolRefs = Array.isArray(policy.tools) ? policy.tools : [];

        archives.push({ folder, policyPath, files, dirs, policy, stubs, configMids, policyToolRefs });

        for (const stub of stubs) {
            registerMidRef(stub.messageId, { name: stub.name, hash: stub.hash });
        }
        for (const ref of policyToolRefs) {
            registerMidRef(ref.messageId, { name: ref.name, hash: ref.hash });
        }
        for (const mid of configMids) {
            registerMidRef(mid, {});
        }
    }

    // Library exports name publishes through their nested refs as well.
    for (const files of library.values()) {
        for (const file of files) {
            for (const ref of file.nestedRefs) {
                registerMidRef(ref.messageId, { name: ref.name, hash: ref.hash });
            }
        }
    }

    for (const [mid, info] of midInfo) {
        if (info.hashes.size > 1) {
            fail(`messageId ${mid} (${[...info.names].join('/') || 'unnamed'}) carries ${info.hashes.size} different hashes across sources: ${[...info.hashes].join(', ')}`);
        }
    }

    // ------------------------------------------------------------------ rebuild
    let regenerated = 0;
    for (const archive of archives) {
        console.log(`\n${archive.folder} (${path.basename(archive.policyPath)}):`);

        // Referenced set = stubs + policy.tools + config mids.
        const seed = new Map(); // mid -> name (may be undefined for config-only refs)
        const addMid = (mid, name) => {
            if (!mid) {
                return;
            }
            if (!seed.has(mid) || (name && !seed.get(mid))) {
                seed.set(mid, name);
            }
        };
        for (const stub of archive.stubs) {
            addMid(stub.messageId, stub.name);
        }
        for (const ref of archive.policyToolRefs) {
            addMid(ref.messageId, ref.name);
        }
        for (const mid of archive.configMids) {
            addMid(mid, undefined);
        }

        // Closure under nested refs: the embedded import re-imports every nested ref,
        // so each of them must be embedded as a top-level entry too.
        const closure = new Map(); // mid -> { name, libraryFile, hash }
        let frontier = [...seed.keys()];
        const seen = new Set();
        const missingLibrary = [];
        while (frontier.length) {
            const next = [];
            for (const mid of frontier) {
                if (seen.has(mid)) {
                    continue;
                }
                seen.add(mid);
                const name = seed.get(mid);
                const candidates = name ? library.get(name) : undefined;
                if (!candidates || !candidates.length) {
                    missingLibrary.push(`${mid} ("${name || 'no name in ref'}")`);
                    continue;
                }
                if (candidates.length > 1) {
                    fail(`${archive.folder}: ${candidates.length} library exports named "${name}"; cannot pick content for ${mid}`);
                }
                closure.set(mid, { name, libraryFile: candidates[0] });
                for (const ref of [...(candidates[0].nestedRefs), ...(candidates[0].row.tools || [])]) {
                    if (!ref.messageId) {
                        continue; // identity-less refs are unresolvable; reported when the entry is validated
                    }
                    if (!seen.has(ref.messageId)) {
                        addMid(ref.messageId, ref.name);
                        next.push(ref.messageId);
                    }
                }
            }
            frontier = next;
        }

        if (missingLibrary.length) {
            fail(`${archive.folder}: referenced tools with no library export: ${missingLibrary.join(', ')}`);
            continue;
        }

        const missingHash = [];
        for (const [mid, { name }] of closure) {
            const info = midInfo.get(mid);
            const hash = info && info.hashes.size === 1 ? [...info.hashes][0] : undefined;
            if (!hash) {
                missingHash.push(`${mid} ("${name}")`);
                continue;
            }
            closure.get(mid).hash = hash;
            const newest = newestPublishMid(name, midInfo);
            if (newest && newest !== mid) {
                warn(`${archive.folder}: "${name}" embeds the newest publish (${newest}) under the older identity ${mid}`);
            }
        }
        const entryList = [...closure.entries()]
            .map(([mid, { name, libraryFile, hash }]) => buildToolEntry(libraryFile, mid, hash))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.messageId.localeCompare(b.messageId));

        if (missingHash.length) {
            fail(`${archive.folder}: referenced tools without a resolvable publish hash: ${missingHash.join(', ')}`);
            continue;
        }

        // Nothing to embed (and not the pilot): leave the archive byte-identical.
        if (!entryList.length && archive.folder !== 'CDM ACM0001') {
            console.log(`  no tools referenced, archive left untouched`);
            continue;
        }

        // ------------------------------------------------------------- validate
        const topMids = new Set(entryList.map((entry) => entry.messageId));
        for (const entry of entryList) {
            try {
                const parsed = PolicyImportExport.parseToolEntry({ ...entry });
                if (parsed.config === undefined || !parsed.messageId || !parsed.hash) {
                    fail(`${archive.folder}: ${entry.name} entry does not survive parseToolEntry`);
                }
            } catch (error) {
                fail(`${archive.folder}: ${entry.name} entry rejected by parseToolEntry: ${error.message}`);
            }
            for (const ref of entry.tools || []) {
                // A ref without a messageId cannot resolve through the embedded registry,
                // so the embedded import would fetch it from the source network (or fail
                // on an invalid id) - either way the archive is not self-contained.
                if (!ref.messageId || !topMids.has(ref.messageId)) {
                    fail(`${archive.folder}: ${entry.name} nested ref "${ref.name || ref.messageId || '(no identity)'}" is not a resolvable top-level entry`);
                }
            }
            try {
                await rezipEntryBytes(entry);
            } catch (error) {
                fail(`${archive.folder}: ${entry.name} does not re-serialize through ToolImportExport: ${error.message}`);
            }
        }

        // ------------------------------------------------------------- rebuild
        const keptFiles = archive.files.filter((file) => !file.name.startsWith('tools/'));
        const keptDirs = archive.dirs.filter((dir) => !dir.name.startsWith('tools'));

        const toolEntries = entryList.map((entry, index) => ({
            name: `tools/${entryFileName(entry, index)}.json`,
            data: Buffer.from(JSON.stringify(entry), 'utf8'),
            date: undefined,
            deterministic: true,
        }));
        const entryNames = new Set(toolEntries.map((entry) => entry.name));
        if (entryNames.size !== toolEntries.length) {
            fail(`${archive.folder}: duplicate tool entry filenames`);
            continue;
        }
        if (!keptDirs.some((dir) => dir.name === 'tools/')) {
            keptDirs.push({ name: 'tools/', date: undefined });
        }

        let sample = null;
        if (archive.folder === 'CDM ACM0001') {
            sample = await buildRecordSample();
            await validateRecordSample(sample);
            if (!CHECK_ONLY) {
                toolEntries.push(sample);
                if (!keptDirs.some((dir) => dir.name === 'tests/')) {
                    keptDirs.push({ name: 'tests/', date: undefined });
                }
            }
        }

        const buffer = await writeZip(archive.policyPath, [...keptFiles, ...toolEntries], keptDirs);
        // Double-build: rebuilding from the same inputs must be byte-identical.
        const buffer2 = await writeZip(archive.policyPath, [...keptFiles, ...toolEntries], keptDirs);
        if (sha256hex(buffer) !== sha256hex(buffer2)) {
            fail(`${archive.folder}: rebuild is not byte-deterministic`);
            continue;
        }

        regenerated++;
        const toolsCount = archive.stubs.length;
        console.log(`  stubs ${toolsCount} -> entries ${entryList.length}, sha256 ${sha256hex(buffer).slice(0, 16)}…, ${buffer.length} bytes${CHECK_ONLY ? ' (check only)' : ''}`);
    }

    // ------------------------------------------------------------------ summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`archives regenerated: ${regenerated} of ${archives.length}`);
    if (warnings.length) {
        console.log(`\nwarnings (${warnings.length}):`);
        for (const warning of warnings) {
            console.log(`  - ${warning}`);
        }
    }
    if (failures.length) {
        console.error(`\nfailures (${failures.length}):`);
        for (const failure of failures) {
            console.error(`  - ${failure}`);
        }
        process.exitCode = 1;
    } else {
        console.log('no failures');
    }
}

/**
 * The pilot sample record: one START row in the iRecFullFlow byte format (CRLF, no
 * header) plus the empty documents/ and results/ dirs the product writer emits.
 */
async function buildRecordSample() {
    const zip = new JSZip();
    ImportExportUtils.addDeterministicZipDir(zip, 'documents');
    ImportExportUtils.addDeterministicZipDir(zip, 'results');
    zip.file(RecordImportExport.recordFileName, `${SAMPLE_START_ROW}\r\n`, ImportExportUtils.getDeterministicZipFileOptions());
    const data = await zip.generateAsync({ type: 'nodebuffer' });
    return {
        name: `tests/${SAMPLE_RECORD_UUID}.record`,
        data,
        date: undefined,
        deterministic: true,
    };
}

async function validateRecordSample(sample) {
    const components = await RecordImportExport.parseZipFile(sample.data);
    if (!components.records.length || components.records[0].method !== 'START') {
        fail(`cdm1 sample record did not parse as a single START row (got ${components.records.length})`);
    }
}

main().catch((error) => {
    console.error(`fatal: ${error.stack || error}`);
    process.exitCode = 1;
});
