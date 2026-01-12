import * as fs from 'node:fs';
import { PolicyProperty } from '../entity/policy-property.js';

export async function GetPropertiesFromFile(filePath: string): Promise<PolicyProperty[]> {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        const rows = data.split('\n');

        const properties = [];

        rows.forEach((row) => {
            const columns = row.split(',');

            if(columns.length === 2 && columns[0]) {
                properties.push({
                    title: columns[0],
                    value: columns[1]
                });
            }
        });

        return properties;
    } catch (error) {
        console.error(`Error reading CSV file: ${error}`);
        throw error;
    }
}
