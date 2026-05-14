import { workerData, parentPort } from 'node:worker_threads';
import { loadPyodide } from 'pyodide'
import { buildTableHelper } from '../table-field-core.js';
import { selectPackagesForImports } from './python-packages.js';

/**
 * Execute function
 */
async function execute() {
    const pyodide = await loadPyodide();

    // Convert a PyProxy result into a structured-clone-safe plain JS value.
    // dict_converter (snake_case — pyodide's JS API uses Python-style names here)
    // recursively turns every Python dict into a plain object via Object.fromEntries,
    // so the postMessage structured clone never has to deal with Maps or live PyProxies.
    const toPlain = (result: any) => typeof result?.toJs === 'function'
        ? result.toJs({ dict_converter: Object.fromEntries })
        : result;

    const done = (result, final = true) => {
        try {
            parentPort.postMessage({ type: 'done', result: toPlain(result), final });
        } catch (err) {
            parentPort.postMessage({ error: 'Failed to serialize result from Python: ' + err.message, final: true });
        }
    }

    const debug = (result: any) => {
        try {
            parentPort.postMessage({ type: 'debug', result: toPlain(result) });
        } catch (err) {
            parentPort.postMessage({ error: 'Failed to serialize result from Python: ' + err.message, final: true });
        }
    }

    const { execFunc, user, documents, artifacts, sources, tablesPack } = workerData;

    pyodide.setStdout({ batched: console.log });
    pyodide.setStderr({ batched: console.error });

    // Convert user-supplied data into native Python dicts/lists so scripts can use
    // Python idioms like `document.get('credentialSubject', [])`. Without this,
    // pyodide.globals.set exposes the JS objects as JsProxy — attribute access works
    // (`document.credentialSubject`) but dict methods (.get, .keys, etc.) do not.
    // This mirrors the Docker entrypoint, which deserializes JSON into real dicts.
    // done/debug stay as JS callables; `table` keeps its JS method shape (user code
    // calls table.keys(v) etc., which would collide with dict.keys after conversion).
    pyodide.globals.set('user', pyodide.toPy(user));
    pyodide.globals.set('documents', pyodide.toPy(documents));
    pyodide.globals.set('artifacts', pyodide.toPy(artifacts));
    pyodide.globals.set('sources', pyodide.toPy(sources));
    pyodide.globals.set('done', done);
    pyodide.globals.set('debug', debug);

    const table = buildTableHelper(tablesPack);
    pyodide.globals.set('table', table);

    // Install only the allowlisted packages the user code actually imports.
    // pyodide.code.find_imports parses the source with the real Python tokenizer,
    // selectPackagesForImports intersects with PYTHON_PACKAGES (mapping sklearn ->
    // scikit-learn etc.), and micropip.install handles both pyodide-distribution and
    // pure-PyPI packages -- covering cases where loadPackage alone misses entries
    // like `pint`. Wheels are pre-downloaded by pyodide-warmup.ts at startup; this
    // step only unpacks them into the worker's WASM FS.
    await pyodide.loadPackage('micropip');
    const micropip = pyodide.pyimport('micropip');
    const findImports = pyodide.pyimport('pyodide.code').find_imports;
    const importsProxy = findImports(execFunc);
    const topLevelImports: string[] = importsProxy.toJs().map((m: string) => m.split('.')[0]);
    importsProxy.destroy();
    const needed = selectPackagesForImports(topLevelImports);
    if (needed.length > 0) {
        await micropip.install(needed);
    }

    await pyodide.runPythonAsync(`
import sys
import os
import importlib
import builtins

def _blocked(*args, **kwargs):
    raise PermissionError("This operation is restricted in this sandbox")

# 1. Replace js module with restricted stub
class _RestrictedModule:
    def __init__(self, name):
        self._name = name
    def __getattr__(self, attr):
        raise ImportError(f"Access to {self._name}.{attr} is restricted in this sandbox")

sys.modules['js'] = _RestrictedModule('js')
sys.modules['pyodide.http'] = _RestrictedModule('pyodide.http')

# sqlite3 is pulled transitively by geopandas -> fiona (for GeoPackage/SpatiaLite support).
# Evict any cached entries (including submodules) so the import hook below sees fresh lookups,
# then stub the top-level name so cached references raise.
for _cached in [m for m in list(sys.modules) if m == 'sqlite3' or m.startswith('sqlite3.')]:
    del sys.modules[_cached]
sys.modules['sqlite3'] = _RestrictedModule('sqlite3')

# 2. Block dangerous os functions
for attr in ['system', 'popen', 'execl', 'execle', 'execlp', 'execv', 'execve',
             'execvp', 'execvpe', 'spawnl', 'spawnle', 'spawnlp', 'spawnv',
             'spawnve', 'spawnvp', 'spawnvpe']:
    if hasattr(os, attr):
        setattr(os, attr, _blocked)

# 3. Block subprocess dangerous functions
import subprocess as _subprocess
for attr in ['run', 'call', 'check_call', 'check_output', 'Popen', 'getoutput', 'getstatusoutput']:
    if hasattr(_subprocess, attr):
        setattr(_subprocess, attr, _blocked)

# 5. Block socket networking functions
import socket as _socket
for attr in ['socket', 'create_connection', 'create_server', 'getaddrinfo', 'gethostbyname', 'gethostbyaddr']:
    if hasattr(_socket, attr):
        setattr(_socket, attr, _blocked)

# 6. Block importlib.reload to prevent undoing patches
import importlib as _importlib
_importlib.reload = _blocked

# 7. Install import hook to prevent bypassing module restrictions (PEP 451)
from importlib.abc import MetaPathFinder

_blocked_modules = {'js', 'pyodide.http', 'cffi', '_posixsubprocess', 'sqlite3'}

class _SandboxImportBlocker(MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if fullname in _blocked_modules or fullname.startswith(('js.', 'pyodide.http.', 'cffi.', 'sqlite3.')):
            raise ImportError(f"Import of {fullname} is restricted in this sandbox")
        return None

sys.meta_path.insert(0, _SandboxImportBlocker())

# 8. Guard builtins.__import__ against bypass (closure hides _original_import from __globals__)
def _make_guarded_import():
    _orig = builtins.__import__
    def _guarded_import(name, *args, **kwargs):
        if name in _blocked_modules or any(name.startswith(prefix + '.') for prefix in ('js', 'pyodide.http', 'cffi', 'sqlite3')):
            raise ImportError(f"Import of {name} is restricted in this sandbox")
        return _orig(name, *args, **kwargs)
    return _guarded_import
builtins.__import__ = _make_guarded_import()

# 9. Clear os.environ last (after all library imports that may set their own vars)
_keep_keys = {'HOME', 'PATH'}
for key in list(os.environ.keys()):
    if key not in _keep_keys:
        del os.environ[key]
`);

    try {
        await pyodide.runPythonAsync(execFunc);
    } catch (error) {
        console.error('Failed to run python script:', error);
        parentPort?.postMessage({ error: error.message, final: true });
    }
}

execute();
