import {
    isAncestorType,
    isRelationType,
    SchemaHelper
} from '@guardian/interfaces';

interface DependencyField {
    name: string;
    customType?: string;
    dependency?: { on: string; kind: string };
}

function validateScope(document: any, scope: string): void {
    if (!document?.properties || typeof document.properties !== 'object') {
        return;
    }

    const fields = new Map<string, DependencyField>();
    for (const name of Object.keys(document.properties)) {
        const comment = SchemaHelper.parseFieldComment(
            document.properties[name]?.$comment
        );
        fields.set(name, {
            name,
            customType: comment.customType,
            dependency: comment.dependency
        });
    }

    const edges = new Map<string, string>();
    for (const field of fields.values()) {
        const dependency = field.dependency;
        if (!dependency) {
            continue;
        }
        if (!dependency.on || !dependency.kind) {
            throw new Error(
                `Invalid dependency on field '${field.name}' in ${scope}.`
            );
        }
        if (!isRelationType(dependency.kind, field.customType || '')) {
            throw new Error(
                `Unsupported dependency kind '${dependency.kind}' ` +
                `on field '${field.name}' in ${scope}.`
            );
        }
        const parent = fields.get(dependency.on);
        if (!parent) {
            throw new Error(
                `Dependency target '${dependency.on}' for field ` +
                `'${field.name}' does not exist in ${scope}.`
            );
        }
        if (parent === field) {
            throw new Error(
                `Field '${field.name}' cannot depend on itself in ${scope}.`
            );
        }
        edges.set(field.name, parent.name);
    }

    const complete = new Set<string>();
    for (const name of edges.keys()) {
        const path = new Set<string>();
        let current: string | undefined = name;
        while (current && !complete.has(current)) {
            if (path.has(current)) {
                throw new Error(
                    `Circular field dependency detected in ${scope}.`
                );
            }
            path.add(current);
            current = edges.get(current);
        }
        for (const item of path) {
            complete.add(item);
        }
    }

    for (const field of fields.values()) {
        const dependency = field.dependency;
        if (!dependency) {
            continue;
        }
        const parent = fields.get(dependency.on);
        if (!parent || !isAncestorType(
            dependency.kind,
            parent.customType || '',
            field.customType || ''
        )) {
            throw new Error(
                `Field '${field.name}' cannot depend on ` +
                `'${parent?.name || dependency.on}' in ${scope}: ` +
                'the field types are incompatible.'
            );
        }
    }

    for (const [name, definition] of Object.entries(document.$defs || {})) {
        validateScope(definition, `${scope}.$defs['${name}']`);
    }
}

export function validateSchemaDependencies(schema: any): void {
    const document = schema?.document || schema;
    validateScope(document, document?.$id || 'schema');
}
