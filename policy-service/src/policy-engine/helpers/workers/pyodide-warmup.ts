import { PYTHON_PACKAGES } from './python-packages.js';

/**
 * Pre-cache Pyodide packages at startup so Worker Threads
 * don't need to download them on first execution.
 */
export async function warmupPyodideCache(): Promise<void> {
    if (process.env.PYTHON_SANDBOX_MODE === 'docker') {
        console.log('[pyodide-warmup] Skipping — Docker mode enabled');
        return;
    }

    console.log('[pyodide-warmup] Pre-caching Python packages...');
    const start = Date.now();

    try {
        const { loadPyodide } = await import('pyodide');
        const pyodide = await loadPyodide();

        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');

        const libs: string[] = PYTHON_PACKAGES;

        for (const lib of libs) {
            try {
                await micropip.install(lib);
            } catch (e) {
                console.error(`[pyodide-warmup] Failed to cache ${lib}:`, (e as Error)?.message || e);
            }
        }

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`[pyodide-warmup] Done in ${elapsed}s — packages cached for Worker Threads`);
    } catch (e) {
        console.error('[pyodide-warmup] Failed:', (e as Error)?.message || e);
    }
}
