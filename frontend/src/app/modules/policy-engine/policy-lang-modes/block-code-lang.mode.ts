import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/mode/meta';
import CodeMirror, { Mode } from 'codemirror';

CodeMirror.defineMode('block-code-lang', function (config, parserConfig) {
    const keywords = [
        'document',
        'formulas',
        'variables',
        'getField'
    ];
    const isKeyword = new RegExp('(' + keywords.join('|') + ')');
    const syntaxOverlay: Mode<any> = {
        token: function (stream) {
            const pos = stream.pos;
            if (stream.match(isKeyword)) {
                const pre = stream.string[pos - 1];
                const next = stream.string[stream.pos];
                if ((!pre || /[^\w]/.test(pre)) && (!next || /[^\w]/.test(next))) {
                    return 'block-code-highlight';
                }
            }
            while (stream.next() != null && !stream.match(isKeyword, false)) { }
            return null;
        }
    };
    return CodeMirror.overlayMode(CodeMirror.getMode(config, 'javascript'), syntaxOverlay, true);
});