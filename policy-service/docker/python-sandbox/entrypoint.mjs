import { loadPyodide } from 'pyodide';

const PACKAGES = [
    'micropip', 'numpy', 'scipy', 'sympy', 'pandas', 'cftime',
    'astropy', 'statsmodels', 'networkx', 'scikit-learn', 'xarray', 'geopandas'
];

/**
 * Table helper (standalone version of table-field-core.ts buildTableHelper)
 */
function buildTableHelper(tablesPack) {
    const isPlainObject = (value) => {
        return value !== null && value !== undefined && typeof value === 'object' && value.constructor === Object;
    };

    const isTableValue = (value) => isPlainObject(value) && value.type === 'table';

    const emptyTable = () => ({ type: 'table', columnKeys: [], rows: [] });

    const toObject = (value) => {
        if (value === null) return emptyTable();
        if (typeof value === 'string') {
            try { return JSON.parse(value); } catch { return emptyTable(); }
        }
        return value;
    };

    const normalize = (value) => {
        const maybeTable = toObject(value);
        if (!isTableValue(maybeTable)) return emptyTable();
        if (tablesPack && typeof maybeTable.fileId === 'string') {
            const packed = tablesPack[maybeTable.fileId];
            if (packed) {
                return {
                    type: 'table',
                    columnKeys: Array.isArray(packed.columnKeys) ? packed.columnKeys : [],
                    rows: Array.isArray(packed.rows) ? packed.rows : [],
                    fileId: maybeTable.fileId
                };
            }
        }
        return {
            type: 'table',
            columnKeys: Array.isArray(maybeTable.columnKeys) ? maybeTable.columnKeys : [],
            rows: Array.isArray(maybeTable.rows) ? maybeTable.rows : [],
            fileId: typeof maybeTable.fileId === 'string' ? maybeTable.fileId : undefined
        };
    };

    const getColumnKeys = (value) => {
        const table = normalize(value);
        if (table.columnKeys.length > 0) return table.columnKeys;
        const firstRow = table.rows[0];
        return firstRow ? Object.keys(firstRow) : [];
    };

    const getRows = (value) => normalize(value).rows;

    const getColumnKeyByIndex = (value, index) => {
        const keys = getColumnKeys(value);
        const key = keys[index];
        return typeof key === 'string' ? key : '';
    };

    const getCell = (value, rowIndex, keyOrIndex) => {
        const row = getRows(value)[rowIndex];
        if (!row) return undefined;
        const columnKey = typeof keyOrIndex === 'number' ? getColumnKeyByIndex(value, keyOrIndex) : keyOrIndex;
        return row[columnKey];
    };

    const toNumber = (value) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') {
            const parsed = parseFloat(value.replace(',', '.'));
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    };

    const getColumnValues = (value, keyOrIndex) => {
        const columnKey = typeof keyOrIndex === 'number' ? getColumnKeyByIndex(value, keyOrIndex) : keyOrIndex;
        return getRows(value).map((row) => row[columnKey]);
    };

    return { normalize, keys: getColumnKeys, rows: getRows, cell: getCell, col: getColumnValues, num: toNumber };
}

/**
 * Send a JSON message to stdout (protocol line)
 */
function sendMessage(msg) {
    process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Read all of stdin
 */
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Main execution
 */
async function execute() {
    let input;
    try {
        const raw = await readStdin();
        input = JSON.parse(raw);
    } catch (e) {
        sendMessage({ type: 'error', error: 'Failed to parse input: ' + e.message });
        process.exit(1);
    }

    const { execFunc, user, documents, artifacts, sources, tablesPack } = input;

    // Redirect console.log/error to stderr so stdout is reserved for JSON protocol
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args) => process.stderr.write(args.join(' ') + '\n');
    console.error = (...args) => process.stderr.write(args.join(' ') + '\n');

    let pyodide;
    try {
        pyodide = await loadPyodide();
    } catch (e) {
        sendMessage({ type: 'error', error: 'Failed to load Pyodide: ' + e.message });
        process.exit(1);
    }

    const done = (result, final = true) => {
        try {
            const jsResult = typeof result?.toJs === 'function'
                ? result.toJs({ dictConverter: Object })
                : result;
            const serializableResult = jsResult instanceof Map
                ? Object.fromEntries(jsResult)
                : jsResult;
            sendMessage({ type: 'done', result: serializableResult, final });
        } catch (err) {
            sendMessage({ type: 'error', error: 'Failed to serialize result: ' + err.message });
        }
    };

    const debug = (result) => {
        try {
            const jsResult = typeof result?.toJs === 'function'
                ? result.toJs({ dictConverter: Object })
                : result;
            const serializableResult = jsResult instanceof Map
                ? Object.fromEntries(jsResult)
                : jsResult;
            sendMessage({ type: 'debug', result: serializableResult });
        } catch (err) {
            sendMessage({ type: 'error', error: 'Failed to serialize debug: ' + err.message });
        }
    };

    pyodide.setStdout({
        batched: (msg) => {
            sendMessage({ type: 'stdout', message: msg });
        }
    });
    pyodide.setStderr({
        batched: (msg) => {
            process.stderr.write('[pyodide stderr] ' + msg + '\n');
        }
    });

    pyodide.globals.set('user', user);
    pyodide.globals.set('documents', documents);
    pyodide.globals.set('artifacts', artifacts);
    pyodide.globals.set('sources', sources);
    pyodide.globals.set('done', done);
    pyodide.globals.set('debug', debug);

    const table = buildTableHelper(tablesPack);
    pyodide.globals.set('table', table);

    // Load built-in Pyodide packages (faster than micropip, loads from local cache)
    const failedPackages = [];
    for (const pkg of PACKAGES) {
        try {
            await pyodide.loadPackage(pkg);
        } catch (e) {
            process.stderr.write(`Failed to load package ${pkg}: ${e.message}\n`);
            failedPackages.push(pkg);
        }
    }
    if (failedPackages.length > 0) {
        sendMessage({ type: 'stderr', message: `Warning: failed to load packages: ${failedPackages.join(', ')}` });
    }

    // Defense-in-depth: apply Python-level restrictions even inside Docker container
    await pyodide.runPythonAsync(`
import sys
import os
import builtins

def _blocked(*args, **kwargs):
    raise PermissionError("This operation is restricted in this sandbox")

class _RestrictedModule:
    def __init__(self, name):
        self._name = name
    def __getattr__(self, attr):
        raise ImportError(f"Access to {self._name}.{attr} is restricted in this sandbox")

# 1. Block JS bridge and pyodide.http
sys.modules['js'] = _RestrictedModule('js')
sys.modules['pyodide.http'] = _RestrictedModule('pyodide.http')

# 2. Block dangerous os functions
for attr in ['system', 'popen', 'execl', 'execle', 'execlp', 'execv', 'execve',
             'execvp', 'execvpe', 'spawnl', 'spawnle', 'spawnlp', 'spawnv',
             'spawnve', 'spawnvp', 'spawnvpe']:
    if hasattr(os, attr):
        setattr(os, attr, _blocked)

# 3. Clear os.environ to prevent leaking secrets (keep HOME for library compatibility)
_keep_keys = {'HOME', 'PATH'}
for key in list(os.environ.keys()):
    if key not in _keep_keys:
        del os.environ[key]

# 4. Block subprocess dangerous functions
import subprocess as _subprocess
for attr in ['run', 'call', 'check_call', 'check_output', 'Popen', 'getoutput', 'getstatusoutput']:
    if hasattr(_subprocess, attr):
        setattr(_subprocess, attr, _blocked)

# 5. Block importlib.reload to prevent undoing patches
import importlib as _importlib
_importlib.reload = _blocked

# 6. Import hook to block dangerous modules
_blocked_modules = {'js', 'pyodide.http', 'cffi', '_posixsubprocess'}

class _SandboxImportBlocker:
    def find_module(self, fullname, path=None):
        if fullname in _blocked_modules or fullname.startswith(('js.', 'pyodide.http.', 'cffi.')):
            return self
        return None
    def load_module(self, fullname):
        raise ImportError(f"Import of {fullname} is restricted in this sandbox")

sys.meta_path.insert(0, _SandboxImportBlocker())

# 7. Guard builtins.__import__ against bypass (closure hides _original_import from __globals__)
def _make_guarded_import():
    _orig = builtins.__import__
    def _guarded_import(name, *args, **kwargs):
        if name in _blocked_modules or any(name.startswith(prefix + '.') for prefix in ('js', 'pyodide.http', 'cffi')):
            raise ImportError(f"Import of {name} is restricted in this sandbox")
        return _orig(name, *args, **kwargs)
    return _guarded_import
builtins.__import__ = _make_guarded_import()
`);

    try {
        await pyodide.runPythonAsync(execFunc);
    } catch (error) {
        sendMessage({ type: 'error', error: error.message });
    }
}

execute().then(() => process.exit(0)).catch((e) => {
    sendMessage({ type: 'error', error: 'Fatal: ' + e.message });
    process.exit(1);
});
