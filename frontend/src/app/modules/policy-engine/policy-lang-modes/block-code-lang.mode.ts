import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/mode/meta';
import CodeMirror, { Mode } from 'codemirror';

CodeMirror.defineMode('block-code-lang', function (config, parserConfig) {
    const fields = (config as any).links || [];
    const keywords = [
        'user',
        'document',
        'formulas',
        'variables',
        'getField'
    ];

    // const links: string[] = [];
    // if (Array.isArray(fields)) {
    //     for (const path of fields) {
    //         links.push(`${path}`);
    //     }
    // }
    // links.sort((a, b) => a.length > b.length ? -1 : 1);

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

            let startIndexA = stream.string.lastIndexOf('document.', pos - 1) + 9;
            let startIndexB = stream.string.lastIndexOf('\'', pos - 1) + 1;
            if (startIndexA > pos) {
                startIndexA = 8 //-1;
            }
            if (startIndexB > pos) {
                startIndexA = 0 //-1;
            }
            if (startIndexA === 8 && startIndexB === 0) {
                stream.next();
                return null;
            }

            const isA = startIndexA > startIndexB;
            const startIndex = isA ? startIndexA : startIndexB;
            const fullText = stream.string.slice(startIndex);

            for (const field of fields) {
                if (field.pattern.test(fullText)) {
                    const endIndex = startIndex + field.path.length;
                    if (endIndex > pos) {
                        const next = stream.string[endIndex];
                        if (isA) {
                            if (!next || next === '.' || /[^\w]/.test(next)) {
                                stream.pos = endIndex;
                                return `block-code-link-highlight path-${field.path}`;
                            }
                        } else {
                            if (next === '\'' || next === '.') {
                                stream.pos = endIndex;
                                return `block-code-link-highlight path-${field.path}`;
                            }
                        }
                    }
                }
            }
            // for (const link of links) {
            //     if (text.startsWith(link)) {
            //         const pre = stream.string[pos - 1];
            //         const next = stream.string[pos + link.length];
            //         if (pre === '\'' && next === '\'') {
            //             stream.pos += link.length;
            //             return `block-code-link-highlight path-${link}`;
            //         }
            //         const preObject = stream.string.substring(pos - 9, 9);
            //         if (preObject === 'document.') {
            //             if ((!next || /[^\w]/.test(next))) {
            //                 stream.pos += link.length;
            //                 return `block-code-link-highlight path-${link}`;
            //             }
            //         }
            //     }
            // }
            stream.next();
            return null;
        }
    };
    return CodeMirror.overlayMode(CodeMirror.getMode(config, 'javascript'), syntaxOverlay, true);
});