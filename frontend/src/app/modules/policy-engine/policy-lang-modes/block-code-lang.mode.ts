import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/mode/meta';
import CodeMirror, { Mode } from 'codemirror';

CodeMirror.defineMode('block-code-lang', function (config, parserConfig) {
    const inputFields = (config as any).inputLinks || [];
    const outputFields = (config as any).outputLinks || [];

    const keywords = [
        'user',
        'document',
        'result',
        'formulas',
        'variables',
        'mathjs',
        'formulajs',
        'getField'
    ];

    const getIndex = function (text: string, pos: number) {
        let i1 = text.lastIndexOf('document.', pos - 1) + 9;
        if (i1 < 9 || i1 > pos) {
            i1 = -1;
        }
        let i2 = text.lastIndexOf('result.', pos - 1) + 7;
        if (i2 < 7 || i2 > pos) {
            i2 = -1;
        }
        let i3 = text.lastIndexOf('\'', pos - 1) + 1;
        if (i3 < 1 || i3 > pos) {
            i3 = -1;
        }
        if (i1 < 0 && i2 < 0 && i3 < 0) {
            return null;
        }
        const max = Math.max(i1, i2, i3);
        if (max === i1) {
            return {
                type: 'document',
                index: i1
            }
        } else if (max === i2) {
            return {
                type: 'result',
                index: i2
            }
        } else {
            return {
                type: 'link',
                index: i3
            }
        }
    }

    const syntaxOverlay: Mode<any> = {
        token: function (stream) {
            const pos = stream.pos;
            const text = stream.string.slice(stream.pos);
            for (const keyword of keywords) {
                if (text.startsWith(keyword)) {
                    const pre = stream.string[pos - 1];
                    const next = stream.string[pos + keyword.length];
                    if ((!pre || /[^\w]/.test(pre)) && (!next || /[^\w]/.test(next))) {
                        stream.pos += keyword.length;
                        return 'block-code-highlight';
                    }
                }
            }

            if (text[0] === '.' || text[0] === '\'') {
                stream.next();
                return null;
            }

            const index = getIndex(stream.string, pos);
            if (!index) {
                stream.next();
                return null;
            }

            const fullText = stream.string.slice(index.index);
            if (index.type === 'document') {
                for (const field of inputFields) {
                    if (field.pattern.test(fullText)) {
                        const endIndex = index.index + field.path.length;
                        if (endIndex > pos) {
                            const next = stream.string[endIndex];
                            if (!next || next === '.' || /[^\w]/.test(next)) {
                                stream.pos = endIndex;
                                return `block-code-link-highlight path-${field.path} type-document`;
                            }
                        }
                    }
                }
            } else if (index.type === 'result') {
                for (const field of outputFields) {
                    if (field.pattern.test(fullText)) {
                        const endIndex = index.index + field.path.length;
                        if (endIndex > pos) {
                            const next = stream.string[endIndex];
                            if (!next || next === '.' || /[^\w]/.test(next)) {
                                stream.pos = endIndex;
                                return `block-code-link-highlight path-${field.path} type-result`;
                            }
                        }
                    }
                }
            } else {
                for (const field of inputFields) {
                    if (field.pattern.test(fullText)) {
                        const endIndex = index.index + field.path.length;
                        if (endIndex > pos) {
                            const next = stream.string[endIndex];
                            if (next === '\'' || next === '.') {
                                stream.pos = endIndex;
                                return `block-code-link-highlight path-${field.path} type-link`;
                            }
                        }
                    }
                }
            }
            stream.next();
            return null;
        }
    };
    return CodeMirror.overlayMode(CodeMirror.getMode(config, 'javascript'), syntaxOverlay, true);
});