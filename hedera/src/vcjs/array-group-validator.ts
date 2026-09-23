import { ISchemaArrayDependency } from '@guardian/interfaces';

export interface ArrayGroupValidationError {
    instancePath: string;
    schemaPath: string;
    message: string;
    keyword: 'arrayGroupLength' | 'arrayGroupMapping';
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

function normalizeMappedValue(value: unknown): unknown {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    return value;
}

function describeMappedValue(value: unknown): string {
    return value === null ? 'empty' : `'${String(value)}'`;
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
        const sourcePath = dependency.on.join('.');
        const targetPath = dependency.field.join('.');
        if (sourceLength !== targetLength) {
            errors.push({
                instancePath: `/${dependency.field.join('/')}`,
                schemaPath: '#/arrayDependencies',
                message: `'${targetPath}' has ${targetLength} entries, ` +
                    `but '${sourcePath}' has ${sourceLength}.`,
                keyword: 'arrayGroupLength',
                params: {}
            });
            continue;
        }
        if (!dependency.valueMappings?.length) {
            continue;
        }
        const sourceEntries = readByPath(subject, dependency.on) || [];
        const targetEntries = readByPath(subject, dependency.field) || [];
        for (let index = 0; index < sourceLength; index++) {
            const sourceEntry = sourceEntries[index];
            const targetEntry = targetEntries[index];
            if (!sourceEntry || !targetEntry) {
                continue;
            }
            for (const mapping of dependency.valueMappings) {
                const sourceValue = normalizeMappedValue(readByPath(sourceEntry, mapping.source));
                const targetValue = normalizeMappedValue(readByPath(targetEntry, mapping.target));
                if (sourceValue === targetValue) {
                    continue;
                }
                const from = `${sourcePath}[${index}].${mapping.source.join('.')}`;
                const to = `${targetPath}[${index}].${mapping.target.join('.')}`;
                errors.push({
                    instancePath: `/${dependency.field.join('/')}/${index}/${mapping.target.join('/')}`,
                    schemaPath: '#/arrayDependencies',
                    message: `'${to}' is ${describeMappedValue(targetValue)}, ` +
                        `but must copy '${from}' which is ${describeMappedValue(sourceValue)}.`,
                    keyword: 'arrayGroupMapping',
                    params: {}
                });
            }
        }
    }

    return errors;
}
