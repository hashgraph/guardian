export interface IMathSchemaPair {
    inputSchema: string | null | undefined;
    outputSchema: string | null | undefined;
}

/**
 * Walks groups/items of a math expression section and calls the callback for every link item.
 */
function forEachLink(section: any, callback: (link: any) => void): void {
    if (!Array.isArray(section)) {
        return;
    }
    for (const item of section) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        if (Array.isArray(item.items)) {
            forEachLink(item.items, callback);
        } else if (item.type === 'link') {
            callback(item);
        }
    }
}

/**
 * Resets the per-field `schema` of math block links after the block input/output schema was changed.
 * @returns true if the expression was modified
 */
export function resetMathLinkSchemas(
    expression: any,
    previous: IMathSchemaPair,
    next: IMathSchemaPair
): boolean {
    if (!expression || typeof expression !== 'object') {
        return false;
    }
    let changed = false;

    if ((previous.inputSchema || '') !== (next.inputSchema || '')) {
        forEachLink(expression.variables, (link) => {
            if (link.schema && link.schema === previous.inputSchema) {
                link.schema = '';
                changed = true;
            }
        });
    }

    if ((previous.outputSchema || '') !== (next.outputSchema || '')) {
        forEachLink(expression.outputs, (link) => {
            if (link.schema) {
                link.schema = '';
                changed = true;
            }
        });
    }

    return changed;
}
