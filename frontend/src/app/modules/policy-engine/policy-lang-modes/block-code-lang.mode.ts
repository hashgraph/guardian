import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/mode/meta';
import CodeMirror, { Mode } from 'codemirror';

CodeMirror.defineMode('block-code-lang', function (config, parserConfig) {
    const fields = (config as any).links;
    const keywords = [
        'document',
        'formulas',
        'variables',
        'getField'
    ];
    const links: string[] = [];
    if (Array.isArray(fields)) {
        for (const path of fields) {
            links.push(`${path}`);
        }
    }
    links.sort((a, b) => a.length > b.length ? -1 : 1);

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
            for (const link of links) {
                if (text.startsWith(link)) {
                    const pre = stream.string[pos - 1];
                    const next = stream.string[pos + link.length];
                    if (pre === '\'' && next === '\'') {
                        stream.pos += link.length;
                        return `block-code-link-highlight path-${link}`;
                    }
                    const preObject = stream.string.substring(pos - 9, 9);
                    if (preObject === 'document.') {
                        if ((!next || /[^\w]/.test(next))) {
                            stream.pos += link.length;
                            return `block-code-link-highlight path-${link}`;
                        }
                    }
                }
            }
            stream.next();
            return null;



            // const pos = stream.pos;
            // const keyword = stream.match(isKeyword);
            // if (keyword) {
            //     const pre = stream.string[pos - 1];
            //     const next = stream.string[stream.pos];
            //     if (keywords.includes(keyword[0])) {
            //         if ((!pre || /[^\w]/.test(pre)) && (!next || /[^\w]/.test(next))) {
            //             return 'block-code-highlight';
            //         }
            //     } else {
            //         if (pre === '\'' && next === '\'') {
            //             return 'block-code-link-highlight';
            //         }
            //         const p = stream.string.substr(pos - 9, 9);
            //         if (p === 'document.' && next !== '.' && (!next || /[^\w]/.test(next))) {
            //             return 'block-code-link-highlight';
            //         }
            //     }
            // }
            // while (stream.next() != null && !stream.match(isKeyword, false)) { }
            return null;
        }
    };
    return CodeMirror.overlayMode(CodeMirror.getMode(config, 'javascript'), syntaxOverlay, true);
});