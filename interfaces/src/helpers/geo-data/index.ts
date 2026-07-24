import { continents, countries } from 'countries-list';
import { allCountries } from 'country-region-data';
import { isRelationType } from '../field-relations.js';

export interface GeoState {
    value: string;
    country: string;
    name: string;
}

function stateValue(
    countryCode: string,
    name: string,
    shortCode?: string
): string {
    return shortCode ? `${countryCode}-${shortCode}` : name;
}

export function isGeoCustomType(customType: string): boolean {
    return isRelationType('geo', customType);
}

export function isCountry(code: string): boolean {
    return Object.prototype.hasOwnProperty.call(countries, code);
}

export function isContinent(code: string): boolean {
    return Object.prototype.hasOwnProperty.call(continents, code);
}

export function getAllContinents(): { value: string; name: string }[] {
    return Object.entries(continents).map(([value, name]) => ({
        value,
        name
    }));
}

export function getAllCountries(): { value: string; name: string }[] {
    return Object.entries(countries).map(([value, country]) => ({
        value,
        name: country.name
    }));
}

export function getContinentOfCountry(country: string): string | null {
    const entry = Object.entries(countries)
        .find(([countryCode]) => countryCode === country);
    return entry?.[1].continent || null;
}

export function getCountriesOfContinent(continent: string): string[] {
    return Object.keys(countries)
        .filter((country) => getContinentOfCountry(country) === continent);
}

export function getStatesOfCountry(country: string): GeoState[] {
    const entry = allCountries.find((item) => item[1] === country);
    if (!entry) {
        return [];
    }
    return entry[2].map(([name, shortCode]) => ({
        value: stateValue(country, name, shortCode),
        country,
        name
    }));
}

export function getCountriesOfState(state: string): string[] {
    const result: string[] = [];
    for (const [, countryCode, regions] of allCountries) {
        for (const [name, shortCode] of regions) {
            if (stateValue(countryCode, name, shortCode) === state) {
                result.push(countryCode);
            }
        }
    }
    return result;
}
