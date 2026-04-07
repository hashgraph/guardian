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
