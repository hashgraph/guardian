import * as fs from 'node:fs';
import { PolicyProperty } from '../entity/policy-property.js';

/**
 * Parses one CSV line, supporting double-quoted fields (with "" as an escaped quote)
 * so a description column containing commas doesn't get split into extra columns.
 */
export function parseCsvLine(line: string): string[] {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
            continue;
        }

        if (char === '"' && current === '') {
            inQuotes = true;
            continue;
        }
        if (char === ',') {
            columns.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    columns.push(current);

    return columns;
}

export async function GetPropertiesFromFile(filePath: string): Promise<PolicyProperty[]> {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        const rows = data.split('\n');

        const properties = [];

        rows.forEach((row) => {
            const line = row.replace(/\r$/, '');
            if (!line) {
                return;
            }
            const columns = parseCsvLine(line);

            if (columns.length >= 2 && columns[0]) {
                properties.push({
                    title: columns[0],
                    value: columns[1],
                    description: columns[2] || undefined
                });
            }
        });

        return properties;
    } catch (error) {
        console.error(`Error reading CSV file: ${error}`);
        throw error;
    }
}
