import {
    getContinentOfCountry,
    getCountriesOfState,
    isAncestorType,
    isContinent,
    isCountry,
    isGeoCustomType,
    SchemaField
} from '@guardian/interfaces';

export interface GeoValidationError {
    instancePath: string;
    schemaPath: string;
    message: string;
    keyword: 'geoConsistency';
    params: Record<string, never>;
}

type GeoType = 'continent' | 'country' | 'state';

interface PresentGeoField {
    field: SchemaField;
    type: GeoType;
    value: string;
    path: string;
}

function error(path: string, message: string): GeoValidationError {
    return {
        instancePath: path,
        schemaPath: '',
        keyword: 'geoConsistency',
        params: {},
        message
    };
}

function stateContinents(value: string): string[] {
    return [...new Set(
        getCountriesOfState(value)
            .map((country) => getContinentOfCountry(country))
            .filter((continent): continent is string => !!continent)
    )];
}

function isConsistent(
    descendant: PresentGeoField,
    ancestor: PresentGeoField
): boolean {
    if (descendant.type === 'country' && ancestor.type === 'continent') {
        return getContinentOfCountry(descendant.value) === ancestor.value;
    }
    if (descendant.type === 'state' && ancestor.type === 'country') {
        return getCountriesOfState(descendant.value).includes(ancestor.value);
    }
    if (descendant.type === 'state' && ancestor.type === 'continent') {
        return stateContinents(descendant.value).includes(ancestor.value);
    }
    return true;
}

function isRelatedAncestor(
    descendant: SchemaField,
    ancestor: SchemaField,
    fieldsByName: Map<string, SchemaField>
): boolean {
    if (!isAncestorType(
        'geo',
        ancestor.customType || '',
        descendant.customType || ''
    )) {
        return false;
    }

    const visited = new Set<string>([descendant.name]);
    let current = descendant;
    while (current.dependency?.kind === 'geo') {
        const parent = fieldsByName.get(current.dependency.on);
        if (!parent || visited.has(parent.name)) {
            return false;
        }
        if (parent === ancestor) {
            return true;
        }
        visited.add(parent.name);
        current = parent;
    }
    return false;
}

function validateScope(
    subject: any,
    fields: SchemaField[],
    path: string,
    errors: GeoValidationError[]
): void {
    if (!subject || typeof subject !== 'object') {
        return;
    }

    const geoFields = fields.filter((field) =>
        isGeoCustomType(field.customType || '')
    );
    const fieldsByName = new Map(
        geoFields.map((field) => [field.name, field])
    );
    const present: PresentGeoField[] = [];
    for (const field of fields) {
        const value = subject[field.name];
        const fieldPath = `${path}/${field.name}`;
        if (isGeoCustomType(field.customType || '') &&
            typeof value === 'string' &&
            value.length) {
            const type = field.customType as GeoType;
            present.push({ field, type, value, path: fieldPath });
            if (type === 'country' && !isCountry(value)) {
                errors.push(error(
                    fieldPath,
                    `Invalid country value '${value}'.`
                ));
            } else if (type === 'continent' && !isContinent(value)) {
                errors.push(error(
                    fieldPath,
                    `Invalid continent value '${value}'.`
                ));
            } else if (type === 'state' &&
                !getCountriesOfState(value).length) {
                errors.push(error(
                    fieldPath,
                    `Invalid state/province value '${value}'.`
                ));
            }
        }

        if (!field.isRef || !field.fields?.length || value === null || value === undefined) {
            continue;
        }
        if (field.isArray && Array.isArray(value)) {
            value.forEach((entry, index) =>
                validateScope(
                    entry,
                    field.fields || [],
                    `${fieldPath}/${index}`,
                    errors
                )
            );
        } else if (!field.isArray) {
            validateScope(value, field.fields, fieldPath, errors);
        }
    }

    for (const descendant of present) {
        for (const ancestor of present) {
            if (!isRelatedAncestor(
                descendant.field,
                ancestor.field,
                fieldsByName
            ) || isConsistent(descendant, ancestor)) {
                continue;
            }
            errors.push(error(
                descendant.path,
                `Field '${descendant.field.name}' ` +
                `(${descendant.type} '${descendant.value}') ` +
                `is not consistent with field '${ancestor.field.name}' ` +
                `(${ancestor.type} '${ancestor.value}').`
            ));
        }
    }

    for (const descendant of present) {
        const dependency = descendant.field.dependency;
        if (!dependency || dependency.kind !== 'geo') {
            continue;
        }
        const ancestorField = fieldsByName.get(dependency.on);
        if (!ancestorField || subject[ancestorField.name]) {
            continue;
        }
        const ancestorType = ancestorField.customType as GeoType;
        const candidates =
            ancestorType === 'continent' && descendant.type === 'state'
                ? stateContinents(descendant.value)
                : getCountriesOfState(descendant.value);
        if (candidates.length > 1) {
            errors.push(error(
                descendant.path,
                `The selected ${descendant.type} is ambiguous ` +
                `without ${ancestorType}.`
            ));
        }
    }
}

export function validateGeoConsistency(
    subject: any,
    fields: SchemaField[]
): GeoValidationError[] {
    const errors: GeoValidationError[] = [];
    validateScope(subject, fields || [], '', errors);
    return errors;
}
