/**
 * Shared Python package list for custom logic block.
 * Used by: custom-logic-python-worker.ts, pyodide-warmup.ts
 * Docker: requirements.txt must be kept in sync (includes cpython-only packages)
 */
export const PYTHON_PACKAGES = [
    'numpy',
    'scipy',
    'sympy',
    'pandas',
    'pint',
    'cftime',
    'astropy',
    'statsmodels',
    'networkx',
    'scikit-learn',
    'xarray',
    'geopandas'
];

/**
 * Map from top-level Python import name to the package name used by micropip.
 * Only entries where they differ need to be listed (default: same name).
 */
export const IMPORT_TO_PACKAGE: Record<string, string> = {
    sklearn: 'scikit-learn',
};

/**
 * Build the subset of PYTHON_PACKAGES that the user code references.
 * Takes the list of top-level import names returned by pyodide.code.find_imports().
 */
export function selectPackagesForImports(topLevelImports: Iterable<string>): string[] {
    const allowed = new Set(PYTHON_PACKAGES);
    const needed = new Set<string>();
    for (const imp of topLevelImports) {
        const pkg = IMPORT_TO_PACKAGE[imp] || imp;
        if (allowed.has(pkg)) {
            needed.add(pkg);
        }
    }
    return [...needed];
}
