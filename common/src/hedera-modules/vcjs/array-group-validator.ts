import { ISchemaArrayDependency } from '@guardian/interfaces';

export interface ArrayGroupValidationError {
    instancePath: string;
    schemaPath: string;
    message: string;
    keyword: 'arrayGroupLength';
    params: Record<string, never>;
}

function readByPath(subject: any, path: string[]): any {
    let current = subject;
    for (const segment of path) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}

function lengthOf(value: any): number | null {
    if (value === undefined) {
        return 0;
    }
    return Array.isArray(value) ? value.length : null;
}

export function validateArrayGroups(
    subject: any,
    dependencies: ISchemaArrayDependency[]
): ArrayGroupValidationError[] {
    const errors: ArrayGroupValidationError[] = [];
    if (!subject || !dependencies || !dependencies.length) {
        return errors;
    }

    for (const dependency of dependencies) {
        const sourceLength = lengthOf(readByPath(subject, dependency.on));
        const targetLength = lengthOf(readByPath(subject, dependency.field));
        if (sourceLength === null || targetLength === null) {
            continue;
        }
        if (sourceLength === targetLength) {
            continue;
        }
        const sourcePath = dependency.on.join('.');
        const targetPath = dependency.field.join('.');
        errors.push({
            instancePath: `/${dependency.field.join('/')}`,
            schemaPath: '#/arrayDependencies',
            message: `'${targetPath}' has ${targetLength} entries, ` +
                `but '${sourcePath}' has ${sourceLength}.`,
            keyword: 'arrayGroupLength',
            params: {}
        });
    }

    return errors;
}
