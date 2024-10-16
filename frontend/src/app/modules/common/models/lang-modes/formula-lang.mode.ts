import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/css-hint';
import 'codemirror/mode/meta';
import 'codemirror/addon/display/placeholder';
import CodeMirror, { Mode, StringStream } from 'codemirror';

CodeMirror.defineMode('formula-lang', function (config, parserConfig) {
    const operations = ['and', 'or'].map((v) => `(${v})`).join('|');
    const isOperations = new RegExp(operations);

    const policySyntaxOverlay: Mode<any> = {
        token: function (stream: StringStream) {
            const variables = (config as any).variables as string[];
            const variablesName = variables.map((v) => `(${v})`).join('|');
            const isVariables = variables.length ? new RegExp(variablesName) : null;

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
        CodeMirror.getMode(config, parserConfig.backdrop || 'application/ld+json'),
        policySyntaxOverlay
    );
});