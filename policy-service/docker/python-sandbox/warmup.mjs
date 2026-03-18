import { loadPyodide } from 'pyodide';

const PACKAGES = [
    'micropip', 'numpy', 'scipy', 'sympy', 'pandas', 'cftime',
    'astropy', 'statsmodels', 'networkx', 'scikit-learn', 'xarray', 'geopandas'
];

/**
 * Pre-install all Python packages at Docker image build time.
 * This caches the wheels in node_modules so containers
 * don't need network access at runtime.
 */
async function warmup() {
    console.log('Warming up Pyodide and pre-installing packages...');

    const pyodide = await loadPyodide();

    console.log('Loading packages via loadPackage (caches wheels locally)...');
    await pyodide.loadPackage(PACKAGES);

    console.log('Warmup complete.');
}

warmup().catch((e) => {
    console.error('Warmup failed:', e);
    process.exit(1);
});
