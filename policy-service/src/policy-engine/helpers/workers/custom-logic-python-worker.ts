import { workerData, parentPort } from 'node:worker_threads';
import { loadPyodide } from 'pyodide'
import { selectPackagesForImports } from './python-packages.js';

/**
 * Execute function
 */
async function execute() {
    const pyodide = await loadPyodide();

    const { execFunc, user, documents, artifacts, sources, tablesPack } = workerData;

    pyodide.setStdout({ batched: console.log });
    pyodide.setStderr({ batched: console.error });

    // Convert user-supplied data into native Python dicts/lists so scripts can use
    // Python idioms like `document.get('credentialSubject', [])`. Without this,
    // pyodide.globals.set exposes the JS objects as JsProxy — attribute access works
    // (`document.credentialSubject`) but dict methods (.get, .keys, etc.) do not.
    // This mirrors the Docker entrypoint, which deserializes JSON into real dicts.
    // done/debug/table are defined as pure Python in the hardening block (not injected
    // as JS callables); __tables_pack__ feeds the Python table helper there.
    pyodide.globals.set('user', pyodide.toPy(user));
    pyodide.globals.set('documents', pyodide.toPy(documents));
    pyodide.globals.set('artifacts', pyodide.toPy(artifacts));
    pyodide.globals.set('sources', pyodide.toPy(sources));
    pyodide.globals.set('__tables_pack__', pyodide.toPy(tablesPack || {}));

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
import json
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

# pyodide.code exposes run_js (arbitrary JS execution in the Node host -> full sandbox escape).
# pyodide.ffi exposes JsProxy / create_proxy / wrap_in_proxy, similarly bridging to JS.
# pyodide.webloop and pyodide.console expose more bridge surface.
# These are pre-cached in sys.modules because the JS side called pyodide.pyimport('pyodide.code')
# before this hardening ran; evict cached entries (including submodules), stub them, and also
# overwrite the submodule attribute on the parent pyodide package so that attribute access via
# 'import pyodide; pyodide.code.run_js(...)' cannot bypass the import hook.
import pyodide as _pyodide_pkg
_pyodide_blocked = ('pyodide.code', 'pyodide.ffi', 'pyodide.webloop', 'pyodide.console')
for _name in _pyodide_blocked:
    for _cached in [m for m in list(sys.modules) if m == _name or m.startswith(_name + '.')]:
        del sys.modules[_cached]
    _stub = _RestrictedModule(_name)
    sys.modules[_name] = _stub
    setattr(_pyodide_pkg, _name.split('.', 1)[1], _stub)
del _pyodide_pkg

# micropip was used by the JS side to install the allowlisted packages; user code must not be
# able to extend the allowlist by calling micropip.install() itself. Drop it from sys.modules
# so re-import goes through the meta-path / __import__ blocker below.
for _cached in [m for m in list(sys.modules) if m == 'micropip' or m.startswith('micropip.')]:
    del sys.modules[_cached]

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

_blocked_modules = {
    'js', 'pyodide.http', 'pyodide.code', 'pyodide.ffi', 'pyodide.webloop', 'pyodide.console',
    'micropip', 'cffi', '_posixsubprocess', 'sqlite3',
}
_blocked_prefixes = (
    'js.', 'pyodide.http.', 'pyodide.code.', 'pyodide.ffi.', 'pyodide.webloop.', 'pyodide.console.',
    'micropip.', 'cffi.', 'sqlite3.',
)

class _SandboxImportBlocker(MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if fullname in _blocked_modules or fullname.startswith(_blocked_prefixes):
            raise ImportError(f"Import of {fullname} is restricted in this sandbox")
        return None

sys.meta_path.insert(0, _SandboxImportBlocker())

# 8. Guard builtins.__import__ against bypass (closure hides _original_import from __globals__)
def _make_guarded_import():
    _orig = builtins.__import__
    def _guarded_import(name, *args, **kwargs):
        if name in _blocked_modules or name.startswith(_blocked_prefixes):
            raise ImportError(f"Import of {name} is restricted in this sandbox")
        return _orig(name, *args, **kwargs)
    return _guarded_import
builtins.__import__ = _make_guarded_import()

# 9. Define the user-facing helpers as pure Python (no JS callables injected into user
# scope). done/debug append to __sandbox_messages__; the JS side drains the list after
# user code finishes and forwards each message to the parent, preserving the
# {type, result, final} protocol.
__sandbox_messages__ = []

def done(result, final=True):
    __sandbox_messages__.append({'type': 'done', 'result': result, 'final': final})

def debug(result):
    __sandbox_messages__.append({'type': 'debug', 'result': result})

# table: port of build_table_helper from docker/python-sandbox/entrypoint.py so pyodide and
# docker modes behave identically. Reads its data from __tables_pack__ (a native Python dict
# the worker set via pyodide.toPy).
def _build_table_helper(tables_pack):
    def is_plain_object(value):
        return isinstance(value, dict)

    def is_table_value(value):
        return is_plain_object(value) and value.get('type') == 'table'

    def empty_table():
        return {'type': 'table', 'columnKeys': [], 'rows': []}

    def to_object(value):
        if value is None:
            return empty_table()
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, ValueError):
                return empty_table()
        return value

    def normalize(value):
        maybe_table = to_object(value)
        if not is_table_value(maybe_table):
            return empty_table()
        if tables_pack and isinstance(maybe_table.get('fileId'), str):
            packed = tables_pack.get(maybe_table['fileId'])
            if packed:
                return {
                    'type': 'table',
                    'columnKeys': packed.get('columnKeys', []) if isinstance(packed.get('columnKeys'), list) else [],
                    'rows': packed.get('rows', []) if isinstance(packed.get('rows'), list) else [],
                    'fileId': maybe_table['fileId']
                }
        return {
            'type': 'table',
            'columnKeys': maybe_table.get('columnKeys', []) if isinstance(maybe_table.get('columnKeys'), list) else [],
            'rows': maybe_table.get('rows', []) if isinstance(maybe_table.get('rows'), list) else [],
            'fileId': maybe_table.get('fileId') if isinstance(maybe_table.get('fileId'), str) else None
        }

    def get_column_keys(value):
        t = normalize(value)
        if t['columnKeys']:
            return t['columnKeys']
        rows = t['rows']
        if rows:
            return list(rows[0].keys())
        return []

    def get_rows(value):
        return normalize(value)['rows']

    def get_column_key_by_index(value, index):
        keys = get_column_keys(value)
        if 0 <= index < len(keys):
            return keys[index]
        return ''

    def get_cell(value, row_index, key_or_index):
        rows = get_rows(value)
        if row_index < 0 or row_index >= len(rows):
            return None
        row = rows[row_index]
        column_key = get_column_key_by_index(value, key_or_index) if isinstance(key_or_index, int) else key_or_index
        return row.get(column_key)

    def to_number(value):
        if isinstance(value, (int, float)):
            return value if value == value else 0  # NaN check
        if isinstance(value, str):
            try:
                return float(value.replace(',', '.'))
            except (ValueError, TypeError):
                return 0
        return 0

    def get_column_values(value, key_or_index):
        column_key = get_column_key_by_index(value, key_or_index) if isinstance(key_or_index, int) else key_or_index
        return [row.get(column_key) for row in get_rows(value)]

    class TableHelper:
        pass

    helper = TableHelper()
    helper.normalize = normalize
    helper.keys = get_column_keys
    helper.rows = get_rows
    helper.cell = get_cell
    helper.col = get_column_values
    helper.num = to_number
    return helper

table = _build_table_helper(__tables_pack__)

# 10. Clear os.environ last (after all library imports that may set their own vars)
_keep_keys = {'HOME', 'PATH'}
for key in list(os.environ.keys()):
    if key not in _keep_keys:
        del os.environ[key]
`);

    // Drain the messages that user code accumulated via done()/debug() and forward them
    // to the parent thread. done/debug are pure Python (see hardening block) and only
    // append to __sandbox_messages__, so we read the list here. dict_converter recursively
    // turns Python dicts into plain objects (no Maps / live PyProxies), keeping each
    // postMessage structured-clone-safe.
    const drainMessages = () => {
        const messagesProxy = pyodide.globals.get('__sandbox_messages__');
        let messages: { type: string; result: any; final?: boolean }[] = [];
        try {
            messages = messagesProxy.toJs({ dict_converter: Object.fromEntries });
        } finally {
            messagesProxy.destroy();
        }
        for (const msg of messages) {
            try {
                if (msg.type === 'done') {
                    parentPort.postMessage({ type: 'done', result: msg.result, final: msg.final ?? true });
                } else if (msg.type === 'debug') {
                    parentPort.postMessage({ type: 'debug', result: msg.result });
                }
            } catch (err) {
                parentPort.postMessage({ error: 'Failed to serialize result from Python: ' + err.message, final: true });
            }
        }
    };

    try {
        let runError: Error | undefined;
        try {
            await pyodide.runPythonAsync(execFunc);
        } catch (error) {
            runError = error;
        }

        // Deliver everything user code accumulated BEFORE reporting any error, so partial
        // and streamed results are not lost when the script later throws.
        drainMessages();

        if (runError) {
            console.error('Failed to run python script:', runError);
            parentPort.postMessage({ error: runError.message, final: true });
        } else {
            // Terminal sentinel on the same ordered message channel as the results above.
            // The parent resolves on this — after every result has been delivered — rather
            // than on the worker 'exit' event, which is not ordered against pending messages.
            parentPort.postMessage({ type: 'complete' });
        }
    } catch (error) {
        // Post-processing failure (e.g. result conversion); surface it as a worker error.
        console.error('Failed in python worker post-processing:', error);
        parentPort.postMessage({ error: error.message, final: true });
    }
}

execute();
