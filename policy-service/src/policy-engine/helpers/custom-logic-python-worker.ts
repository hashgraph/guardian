import { workerData, parentPort } from 'node:worker_threads';
import { loadPyodide } from 'pyodide'
import { buildTableHelper } from '../helpers/table-field-core.js';

/**
 * Execute function
 */
async function execute() {
    const pyodide = await loadPyodide();

    const done = (result, final = true) => {
        try {
            const jsResult = typeof result?.toJs === 'function'
                ? result.toJs({ dictConverter: Object })
                : result;

            const serializableResult = jsResult instanceof Map
                ? Object.fromEntries(jsResult)
                : jsResult;

            parentPort.postMessage({ type: 'done', result: serializableResult, final });
        } catch (err) {
            parentPort.postMessage({ error: 'Failed to serialize result from Python: ' + err.message, final: true });
        }
    }

    const debug = (result: any) => {
        try {
            const jsResult = typeof result?.toJs === 'function'
                ? result.toJs({ dictConverter: Object })
                : result;

            const serializableResult = jsResult instanceof Map
                ? Object.fromEntries(jsResult)
                : jsResult;

            parentPort.postMessage({ type: 'debug', result: serializableResult });
        } catch (err) {
            parentPort.postMessage({ error: 'Failed to serialize result from Python: ' + err.message, final: true });
        }
    }

    const { execFunc, user, documents, artifacts, sources, tablesPack } = workerData;

    pyodide.setStdout({ batched: console.log });
    pyodide.setStderr({ batched: console.error })

    pyodide.globals.set('user', user);
    pyodide.globals.set('documents', documents);
    pyodide.globals.set('artifacts', artifacts);
    pyodide.globals.set('sources', sources);
    pyodide.globals.set('done', done);
    pyodide.globals.set('debug', debug);

    const table = buildTableHelper(tablesPack);
    pyodide.globals.set('table', table);

    await pyodide.loadPackage('micropip');
    const micropip = pyodide.pyimport('micropip');

    const libs = [
        'numpy',
        'scipy',
        'sympy',
        'pandas',
        'pint',
        'duckdb',
        'sqlalchemy',
        'cftime',
        'matplotlib',
        'seaborn',
        'bokeh',
        'altair',
        'cartopy',
        'astropy',
        'statsmodels',
        'networkx'
    ];

    for (const lib of libs) {
        try {
            await micropip.install(lib);
        } catch (e) {
            console.error(`Failed to install python lib: ${lib}`, e);
        }
    }

    try {
        await pyodide.runPythonAsync(execFunc);
    } catch (error) {
        console.log('Failed to run python script:', error);
        parentPort?.postMessage({ error: error.message, final: true });
    }
}

execute();
