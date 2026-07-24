export const RELATIONS: Record<string, {
    parent: Record<string, string | null>;
}> = {
    geo: {
        parent: {
            continent: null,
            country: 'continent',
            state: 'country'
        }
    }
};

export function isRelationType(kind: string, type: string): boolean {
    return !!RELATIONS[kind] &&
        Object.prototype.hasOwnProperty.call(RELATIONS[kind].parent, type);
}

export function relationParent(kind: string, type: string): string | null {
    return RELATIONS[kind]?.parent[type] ?? null;
}

export function relationAncestors(kind: string, type: string): string[] {
    const ancestors: string[] = [];
    let parent = relationParent(kind, type);
    while (parent) {
        ancestors.push(parent);
        parent = relationParent(kind, parent);
    }
    return ancestors;
}

export function isAncestorType(
    kind: string,
    ancestor: string,
    type: string
): boolean {
    return relationAncestors(kind, type).includes(ancestor);
}
