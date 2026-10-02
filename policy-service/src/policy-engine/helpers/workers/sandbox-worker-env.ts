/**
 * Variables a sandbox worker may inherit; everything else (service secrets, DB and
 * Vault credentials, ...) stays out of the worker's `process.env`.
 */
export const SANDBOX_WORKER_ENV_ALLOWLIST: readonly string[] = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ'];

/**
 * Build the minimal `env` option for a custom logic worker thread
 * @param sourceEnv environment to copy from
 */
export function buildSandboxWorkerEnv(sourceEnv: NodeJS.ProcessEnv = process.env): Record<string, string> {
    const sandboxEnv: Record<string, string> = {};
    for (const key of SANDBOX_WORKER_ENV_ALLOWLIST) {
        if (typeof sourceEnv[key] === 'string') {
            sandboxEnv[key] = sourceEnv[key];
        }
    }
    return sandboxEnv;
}
