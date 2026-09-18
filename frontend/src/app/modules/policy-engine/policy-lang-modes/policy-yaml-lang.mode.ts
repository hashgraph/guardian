import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/mode/meta';
import CodeMirror, { Mode, StringStream } from 'codemirror';
import * as KeywordGroups from './keyword-groups';

// keyword -> css-class; earlier group wins on duplicates (old regex order).
const KEYWORD_GROUPS: Array<[string[], string]> = [
    [KeywordGroups.idGroupKeywords, 'policy-id'],
    [KeywordGroups.nameGroupKeywords, 'policy-name'],
    [KeywordGroups.typeGroupKeywords, 'policy-type'],
    [KeywordGroups.versionGroupKeywords, 'policy-version'],
    [KeywordGroups.userGroupKeywords, 'policy-user'],
    [KeywordGroups.tagGroupKeywords, 'policy-tag'],
    [KeywordGroups.complexObjGroupKeywords, 'policy-complex'],
    [KeywordGroups.simplePropertiesGroupKeywords, 'policy-simple'],
    [KeywordGroups.dateGroupKeywords, 'policy-date'],
    [KeywordGroups.arrayGroupKeywords, 'policy-array'],
    [KeywordGroups.flagsGroupKeywords, 'policy-flag'],
    [KeywordGroups.errorGroupKeywords, 'policy-error'],
];

function buildKeywordMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [keywords, type] of KEYWORD_GROUPS) {
        for (const keyword of keywords) {
            if (!map.has(keyword)) {
                map.set(keyword, type);
            }
        }
    }
    return map;
}

const WORD_CHAR = /[A-Za-z0-9_$]/;

CodeMirror.defineMode('policy-yaml-lang', function (config, parserConfig) {
    const keywordType = buildKeywordMap();
    const policySyntaxOverlay: Mode<any> = {
        startState: () => ({ hasSymbols: false }),
        token: function (stream: StringStream, state: any) {
            const start = stream.peek();
            // keyword counts as a key only at a token start (prev char was
            // whitespace, tracked by hasSymbols).
            if (!state.hasSymbols && start != null && WORD_CHAR.test(start)) {
                // ^-anchored: match only at the cursor, no scan-ahead.
                const match = stream.match(/^[A-Za-z0-9_$]+/) as RegExpMatchArray | null;
                if (match) {
                    const isKey = stream.match(/^\s*:/, false);
                    state.hasSymbols = true;
                    if (isKey) {
                        const type = keywordType.get(match[0]);
                        if (type) {
                            return type;
                        }
                    }
                    return null;
                }
            }
            // skip to the next whitespace-preceded keyword (the only spot the
            // branch above fires); anchored read + Map lookup keeps calls cheap.
            let ch = stream.next();
            while (ch != null) {
                const next = stream.peek();
                if (next != null && WORD_CHAR.test(next) && /\s/.test(ch)) {
                    const peek = stream.match(/^[A-Za-z0-9_$]+/, false) as RegExpMatchArray | null;
                    if (peek && keywordType.has(peek[0])) {
                        break;
                    }
                }
                ch = stream.next();
            }
            state.hasSymbols = !!ch && !/\s/.test(ch);
            return null;
        },
    };
    return CodeMirror.overlayMode(
        CodeMirror.getMode(config, parserConfig.backdrop || 'text/x-yaml'),
        policySyntaxOverlay
    );
});
