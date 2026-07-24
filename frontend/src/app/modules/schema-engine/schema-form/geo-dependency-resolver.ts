import {
    getAllContinents,
    getAllCountries,
    getContinentOfCountry,
    getCountriesOfContinent,
    getCountriesOfState,
    getStatesOfCountry,
    isAncestorType
} from '@guardian/interfaces';

export type GeoType = 'continent' | 'country' | 'state';

export interface GeoOption {
    label: string;
    value: string;
}

export interface GeoResolverField {
    name: string;
    type: GeoType;
    value: string | null | undefined;
    dependency?: { on: string; kind: string };
}

export interface GeoResolution {
    values: Record<string, string | null>;
    options: Record<string, GeoOption[]>;
    errors: Record<string, string>;
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function allStates(): GeoOption[] {
    const result = new Map<string, string>();
    for (const country of getAllCountries()) {
        for (const state of getStatesOfCountry(country.value)) {
            if (!result.has(state.value)) {
                result.set(state.value, state.name);
            }
        }
    }
    return [...result].map(([value, label]) => ({ value, label }));
}

function baseOptions(type: GeoType): GeoOption[] {
    if (type === 'continent') {
        return getAllContinents().map((item) => ({
            value: item.value,
            label: item.name
        }));
    }
    if (type === 'country') {
        return getAllCountries().map((item) => ({
            value: item.value,
            label: item.name
        }));
    }
    return allStates();
}

function ancestorCandidates(
    descendantType: GeoType,
    ancestorType: GeoType,
    value: string
): string[] {
    if (descendantType === 'country' && ancestorType === 'continent') {
        const continent = getContinentOfCountry(value);
        return continent ? [continent] : [];
    }
    if (descendantType === 'state' && ancestorType === 'country') {
        return getCountriesOfState(value);
    }
    if (descendantType === 'state' && ancestorType === 'continent') {
        return unique(
            getCountriesOfState(value)
                .map((country) => getContinentOfCountry(country))
                .filter((continent): continent is string => !!continent)
        );
    }
    return [];
}

function descendantValues(
    descendantType: GeoType,
    ancestorType: GeoType,
    value: string
): string[] {
    if (descendantType === 'country' && ancestorType === 'continent') {
        return getCountriesOfContinent(value);
    }
    if (descendantType === 'state' && ancestorType === 'country') {
        return getStatesOfCountry(value).map((state) => state.value);
    }
    if (descendantType === 'state' && ancestorType === 'continent') {
        return unique(
            getCountriesOfContinent(value)
                .flatMap((country) => getStatesOfCountry(country))
                .map((state) => state.value)
        );
    }
    return [];
}

function intersect(options: GeoOption[], values: string[]): GeoOption[] {
    const allowed = new Set(values);
    return options.filter((option) => allowed.has(option.value));
}

function conflictMessage(
    descendant: GeoResolverField,
    ancestor: GeoResolverField,
    values: Record<string, string | null>
): string {
    return `${descendant.type} '${values[descendant.name]}' is not consistent with ` +
        `${ancestor.type} '${values[ancestor.name]}'.`;
}

function isRelatedAncestor(
    descendant: GeoResolverField,
    ancestor: GeoResolverField,
    fieldsByName: Map<string, GeoResolverField>
): boolean {
    if (!isAncestorType('geo', ancestor.type, descendant.type)) {
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

export function resolveGeoDependencies(
    fields: GeoResolverField[],
    changedName: string | null = null
): GeoResolution {
    const values: Record<string, string | null> = {};
    const options: Record<string, GeoOption[]> = {};
    const errors: Record<string, string> = {};
    const fieldsByName = new Map(
        fields.map((field) => [field.name, field])
    );

    for (const field of fields) {
        values[field.name] = field.value || null;
        options[field.name] = baseOptions(field.type);
    }

    const changed = changedName
        ? fields.find((field) => field.name === changedName)
        : undefined;
    const changedValue = changed ? values[changed.name] : null;
    if (changed && changedValue) {
        for (const descendant of fields) {
            const descendantValue = values[descendant.name];
            if (!descendantValue ||
                !isRelatedAncestor(descendant, changed, fieldsByName)) {
                continue;
            }
            const allowed = descendantValues(
                descendant.type,
                changed.type,
                changedValue
            );
            if (!allowed.includes(descendantValue)) {
                values[descendant.name] = null;
            }
        }

        for (const ancestor of fields) {
            if (!isRelatedAncestor(changed, ancestor, fieldsByName)) {
                continue;
            }
            const candidates = ancestorCandidates(
                changed.type,
                ancestor.type,
                changedValue
            );
            if (candidates.length === 1) {
                values[ancestor.name] = candidates[0];
            } else if (
                candidates.length > 1 &&
                !candidates.includes(values[ancestor.name] || '')
            ) {
                values[ancestor.name] = null;
            }
        }
    }

    let populated = true;
    while (populated) {
        populated = false;
        for (const descendant of fields) {
            const descendantValue = values[descendant.name];
            if (!descendantValue) {
                continue;
            }
            for (const ancestor of fields) {
                if (values[ancestor.name] ||
                    !isRelatedAncestor(descendant, ancestor, fieldsByName)) {
                    continue;
                }
                const candidates = ancestorCandidates(
                    descendant.type,
                    ancestor.type,
                    descendantValue
                );
                if (candidates.length === 1) {
                    values[ancestor.name] = candidates[0];
                    populated = true;
                }
            }
        }
    }

    for (const descendant of fields) {
        const descendantValue = values[descendant.name];
        for (const ancestor of fields) {
            if (!isRelatedAncestor(descendant, ancestor, fieldsByName)) {
                continue;
            }
            const ancestorValue = values[ancestor.name];
            if (ancestorValue) {
                options[descendant.name] = intersect(
                    options[descendant.name],
                    descendantValues(
                        descendant.type,
                        ancestor.type,
                        ancestorValue
                    )
                );
            }
            if (!descendantValue) {
                continue;
            }
            const candidates = ancestorCandidates(
                descendant.type,
                ancestor.type,
                descendantValue
            );
            options[ancestor.name] = intersect(
                options[ancestor.name],
                candidates
            );
            if (ancestorValue && !candidates.includes(ancestorValue)) {
                const message = conflictMessage(descendant, ancestor, values);
                errors[descendant.name] = message;
                errors[ancestor.name] = message;
            } else if (
                !ancestorValue &&
                candidates.length > 1 &&
                descendant.dependency?.kind === 'geo' &&
                descendant.dependency.on === ancestor.name
            ) {
                const message =
                    `Several ${ancestor.type} values match the selected ${descendant.type}.`;
                errors[descendant.name] = message;
                errors[ancestor.name] = message;
            }
        }
    }

    return { values, options, errors };
}
