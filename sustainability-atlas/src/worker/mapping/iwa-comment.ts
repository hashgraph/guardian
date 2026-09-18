/**
 * Reads the IWA DMRV `property` path a schema field is tagged with. Guardian's
 * editor stores it as a JSON string in the field's `$comment`, e.g.
 * `{"term":"projectTitle","property":"ActivityImpactModule.name"}`.
 */

/** Resolve the node carrying `$comment` — a oneOf/allOf wrapper keeps it on its first branch. */
function commentTarget(fieldDef: Record<string, unknown>): Record<string, unknown> {
    for (const key of ['oneOf', 'allOf'] as const) {
        const branch = fieldDef[key];
        if (Array.isArray(branch) && branch.length && branch[0] && typeof branch[0] === 'object') {
            return branch[0] as Record<string, unknown>;
        }
    }
    return fieldDef;
}

/**
 * IWA `property` path tagged on a JSON-schema field definition, or null when the
 * field carries no parseable IWA property. Takes the field definition (not the
 * raw `$comment` string) so the oneOf/allOf case is handled here.
 */
export function parseIwaProperty(fieldDef: unknown): string | null {
    if (!fieldDef || typeof fieldDef !== 'object') {
        return null;
    }
    const raw = commentTarget(fieldDef as Record<string, unknown>)['$comment'];

    let parsed: unknown;
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch {
            return null;
        }
    } else if (raw && typeof raw === 'object') {
        parsed = raw;
    } else {
        return null;
    }

    if (!parsed || typeof parsed !== 'object') {
        return null;
    }
    const property = (parsed as Record<string, unknown>)['property'];
    return typeof property === 'string' && property.trim() ? property.trim() : null;
}
