import { assert } from 'chai';
import {
    isPythonSandboxDisabled,
    PYTHON_DISABLED_MESSAGE,
} from '../../../dist/policy-engine/helpers/workers/python-sandbox-mode.js';
import { warmupPyodideCache } from '../../../dist/policy-engine/helpers/workers/pyodide-warmup.js';

describe('python sandbox disabled mode', () => {
    let original;
    beforeEach(() => { original = process.env.PYTHON_SANDBOX_MODE; });
    afterEach(() => {
        if (original === undefined) {
            delete process.env.PYTHON_SANDBOX_MODE;
        } else {
            process.env.PYTHON_SANDBOX_MODE = original;
        }
    });

    it('is disabled only for the "disabled" value', () => {
        delete process.env.PYTHON_SANDBOX_MODE;
        assert.isFalse(isPythonSandboxDisabled());
        process.env.PYTHON_SANDBOX_MODE = 'pyodide';
        assert.isFalse(isPythonSandboxDisabled());
        process.env.PYTHON_SANDBOX_MODE = 'docker';
        assert.isFalse(isPythonSandboxDisabled());
        process.env.PYTHON_SANDBOX_MODE = 'disabled';
        assert.isTrue(isPythonSandboxDisabled());
    });

    it('mentions the env var in the error message', () => {
        assert.include(PYTHON_DISABLED_MESSAGE, 'PYTHON_SANDBOX_MODE=disabled');
    });

    it('skips the Pyodide warmup when disabled', async () => {
        process.env.PYTHON_SANDBOX_MODE = 'disabled';
        const logs = [];
        const log = console.log;
        console.log = (...a) => logs.push(a.join(' '));
        try {
            await warmupPyodideCache();
        } finally {
            console.log = log;
        }
        assert.isTrue(logs.some((l) => l.includes('Skipping')));
        assert.isFalse(logs.some((l) => l.includes('Pre-caching')));
    });
});
