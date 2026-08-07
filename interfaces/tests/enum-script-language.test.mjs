import assert from 'node:assert/strict';
import { ScriptLanguageOption } from '../dist/type/script-language-option.type.js';

describe('ScriptLanguageOption enum', () => {
    it('exposes JAVASCRIPT and PYTHON', () => {
        assert.equal(ScriptLanguageOption.JAVASCRIPT, 'JAVASCRIPT');
        assert.equal(ScriptLanguageOption.PYTHON, 'PYTHON');
        assert.equal(Object.keys(ScriptLanguageOption).length, 2);
    });
});
