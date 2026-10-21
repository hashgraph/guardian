#!/usr/bin/env node
/**
 * Prints `export NAME='value'` lines for the JWT keys of configs/.env.quickstart.guardian.system,
 * the disposable keys every Guardian service needs to start and the CI workflow takes from
 * secrets. Meant for `eval "$(node scripts/quickstart-env.mjs)"` in scripts/local-guardian.sh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

export const QUICKSTART_KEYS = [
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'SERVICE_JWT_PUBLIC_KEY_ALL',
    'SERVICE_JWT_SECRET_KEY_ALL',
];

const defaultConfig = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'configs', '.env.quickstart.guardian.system',
);

export function shellQuote(value) {
    return `'${value.replaceAll("'", "'\\''")}'`;
}

export function renderExports(parsedEnv) {
    return QUICKSTART_KEYS.map((name) => {
        const value = parsedEnv[name];
        if (!value) {
            throw new Error(`${name} is missing from the quickstart configuration`);
        }
        return `export ${name}=${shellQuote(value)}`;
    }).join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        console.log(renderExports(dotenv.parse(fs.readFileSync(process.argv[2] || defaultConfig))));
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
