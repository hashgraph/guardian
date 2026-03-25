import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/css-hint';
import 'codemirror/mode/meta';
import 'codemirror/addon/display/placeholder';
import CodeMirror, { Mode, StringStream } from 'codemirror';

CodeMirror.defineMode('formula-lang', function (config, parserConfig) {
    const operations = [
        'and',
        'or',
        'not',
        'xor',
        '\\=',
        '<',
        '>',
        '\\+',
        '\\-',
        '\\*',
        '\\/'
    ].map((v) => `(${v})`).join('|');
    const isOperations = new RegExp(operations);

    const variables = (config as any).variables as string[];
    const isVariables = variables?.length
        ? new RegExp(variables.map((v) => `(${v})`).join('|'))
        : null;

    const policySyntaxOverlay: Mode<any> = {
        token: function (stream: StringStream) {
            if (stream.match(isOperations)) {
                return 'formula-operation';
            } else if (isVariables && stream.match(isVariables)) {
                return 'formula-variable';
            } else if (stream.match(/([a-zA-Z]+)\(/, false)) {
                stream.next();
                return 'formula-function';
            } else {
                stream.next();
                return null;
            }
        },
    };
    return CodeMirror.overlayMode(
        //text/x-spreadsheet
        CodeMirror.getMode(config, parserConfig.backdrop || 'text/plain'),
        policySyntaxOverlay
    );
});