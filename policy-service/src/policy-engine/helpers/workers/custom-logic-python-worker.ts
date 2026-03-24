import { workerData, parentPort } from 'node:worker_threads';
import { loadPyodide } from 'pyodide'
import { buildTableHelper } from '../table-field-core.js';
import { PYTHON_PACKAGES } from './python-packages.js';

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
    pyodide.setStderr({ batched: console.error });

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

    const libs: string[] = PYTHON_PACKAGES;

    for (const lib of libs) {
        try {
            await micropip.install(lib);
        } catch (e) {
            console.error(`Failed to install python lib: ${lib}:`, e?.message || e);
        }
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

_blocked_modules = {'js', 'pyodide.http', 'cffi', '_posixsubprocess'}

class _SandboxImportBlocker(MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if fullname in _blocked_modules or fullname.startswith(('js.', 'pyodide.http.', 'cffi.')):
            raise ImportError(f"Import of {fullname} is restricted in this sandbox")
        return None

sys.meta_path.insert(0, _SandboxImportBlocker())

# 8. Guard builtins.__import__ against bypass (closure hides _original_import from __globals__)
def _make_guarded_import():
    _orig = builtins.__import__
    def _guarded_import(name, *args, **kwargs):
        if name in _blocked_modules or any(name.startswith(prefix + '.') for prefix in ('js', 'pyodide.http', 'cffi')):
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
