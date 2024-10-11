import CodeMirror from 'codemirror';

export const createAutocomplete = (words: string[]) => {
    return (cm: any, option: any) => {
        return new Promise(function (accept) {
            setTimeout(function () {
                const cursor = cm.getCursor();
                const line = cm.getLine(cursor.line);
                let start = cursor.ch;
                let end = cursor.ch;
                while (start && /\w/.test(line.charAt(start - 1))) --start;
                while (end < line.length && /\w/.test(line.charAt(end))) ++end;
                const word = line.slice(start, end).toLowerCase();
                const r = new RegExp(`^${word}`, 'i');
                const list = words.filter((w) => r.test(w));
                if (list.length) {
                    return accept({
                        list,
                        from: CodeMirror.Pos(cursor.line, start),
                        to: CodeMirror.Pos(cursor.line, end)
                    })
                } else {
                    return accept(null);
                }
            }, 100)
        })
    }
}