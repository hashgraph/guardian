/**
 * Reduce `npm-check-updates --workspaces --jsonUpgraded` output to major bumps only.
 *
 * ncu has no "major" target, so the workflow asks for `--target latest` and this
 * script drops every upgrade whose major (or, for 0.x, minor) did not change.
 * The per-workspace map keyed by package.json path is flattened to one
 * package -> version object.
 *
 * Usage: node filter-major-updates.mjs <raw.json> <out.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [rawPath, outPath] = process.argv.slice(2);
if (!rawPath || !outPath) {
    console.error('Usage: filter-major-updates.mjs <raw.json> <out.json>');
    process.exit(1);
}

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

/**
 * Pull a numeric version out of a range or an `npm:pkg@version` alias.
 * @param {string} range
 * @returns {{major: number, minor: number} | null}
 */
function parseVersion(range) {
    if (typeof range !== 'string') {
        return null;
    }
    const alias = range.startsWith('npm:') ? range.slice(range.lastIndexOf('@') + 1) : range;
    const match = alias.match(/(\d+)\.(\d+)/);
    return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

/**
 * A 0.x release line has no stable API, so a minor bump there is breaking too.
 */
function isMajorBump(current, next) {
    const from = parseVersion(current);
    const to = parseVersion(next);
    if (!from || !to) {
        return false;
    }
    if (from.major !== to.major) {
        return true;
    }
    return from.major === 0 && from.minor !== to.minor;
}

const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const majors = {};

for (const [manifestPath, upgrades] of Object.entries(raw)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const [pkg, next] of Object.entries(upgrades ?? {})) {
        const field = DEP_FIELDS.find((f) => manifest[f]?.[pkg]);
        if (field && isMajorBump(manifest[field][pkg], next)) {
            majors[pkg] = next;
        }
    }
}

writeFileSync(outPath, `${JSON.stringify(majors, null, 2)}\n`);
