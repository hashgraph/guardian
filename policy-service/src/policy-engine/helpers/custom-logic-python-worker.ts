import { workerData, parentPort } from 'node:worker_threads';
import { loadPyodide } from 'pyodide'

/**
 * Execute function
 */
async function execute() {
    const pyodide = await loadPyodide();
    
    const done = (result, final = true) => {
        try {
            console.log(result?.toJs);
            const jsResult = typeof result?.toJs === "function"
                ? result.toJs({ dictConverter: Object })
                : result;

            const serializableResult = jsResult instanceof Map
                ? Object.fromEntries(jsResult)
                : jsResult;

            parentPort.postMessage({ result: serializableResult, final });
        } catch (err) {
            parentPort.postMessage({ error: 'Failed to serialize result from Python: ' + err.message, final: true });
        }
    }

    const { execFunc, user, documents, artifacts, sources } = workerData;

    console.log('python worker working!');

    pyodide.globals.set("user", user);
    pyodide.globals.set("documents", documents);
    pyodide.globals.set("artifacts", artifacts);
    pyodide.globals.set("sources", sources);
    pyodide.globals.set("done", done);
    
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install('numpy');
    await micropip.install('pulp');

    try {
        const result = await pyodide.runPythonAsync(execFunc);
        console.log(result);
    } catch (error) {
        console.log('error', error);
        parentPort?.postMessage({ error: error.message, final: true });
    }
}

execute();
