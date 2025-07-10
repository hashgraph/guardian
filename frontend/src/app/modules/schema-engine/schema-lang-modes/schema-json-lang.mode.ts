import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/mode/meta';
import CodeMirror, { Mode, StringStream } from 'codemirror';
import * as KeywordGroups from './keyword-groups';

CodeMirror.defineMode('schema-json-lang', function (config, parserConfig) {
    const isKeyword = new RegExp(
        '"(' +
            `(${KeywordGroups.keyKeywords.join('|')})` +
        ')"'
    );
    const schemaSyntaxOverlay: Mode<any> = {
        token: function (stream: StringStream) {
            const keyword = stream.match(isKeyword);
            if (keyword && stream.match(/\s*\:/, false)) {
                if (keyword[2]) {
                    return 'schema-key';
                }
            }
            while (stream.next() != null && !stream.match(isKeyword, false)) {}
            return null;
        },
    };
    return CodeMirror.overlayMode(
        CodeMirror.getMode(config, parserConfig.backdrop || 'application/ld+json'),
        schemaSyntaxOverlay
    );
});
