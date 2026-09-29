import fs from 'node:fs';

let cachedVersion: string | undefined;

/**
 * Guardian version; falls back to package.json when not started via npm/yarn.
 */
export function getGuardianVersion(): string {
    if (!cachedVersion) {
        const envVersion = process.env.npm_package_version;
        if (envVersion) {
            cachedVersion = envVersion;
        } else {
            const unknown = 'Unknown';
            try {
                const packageJsonUrl = new URL('../../package.json', import.meta.url);
                const raw = fs.readFileSync(packageJsonUrl, 'utf-8');
                const parsed = JSON.parse(raw);

                cachedVersion = parsed.version || unknown;
            } catch (error) {
                cachedVersion = unknown;
            }
        }
    }

    return cachedVersion;
}
