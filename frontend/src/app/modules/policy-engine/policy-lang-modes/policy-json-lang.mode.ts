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

CodeMirror.defineMode('policy-json-lang', function (config, parserConfig) {
    const keywordType = buildKeywordMap();
    // ^-anchored: match only at the cursor, no scan-ahead over the (long) line.
    const identifierKey = /^"([A-Za-z0-9_$]+)"/;
    const policySyntaxOverlay: Mode<any> = {
        token: function (stream: StringStream) {
            if (stream.peek() === '"') {
                // quoted identifier key: cheap lookup, not a keyword alternation
                const match = stream.match(identifierKey) as RegExpMatchArray | null;
                if (match) {
                    if (stream.match(/^\s*:/, false)) {
                        const type = keywordType.get(match[1]);
                        if (type) {
                            return type;
                        }
                    }
                    return null;
                }
                // non-identifier string (a value, or a quoted key): consume it
                stream.next();
                let ch: string | null;
                let escaped = false;
                while ((ch = stream.next()) != null) {
                    if (ch === '"' && !escaped) {
                        break;
                    }
                    escaped = ch === '\\' && !escaped;
                }
                return null;
            }
            // jump to the next quote
            while (stream.next() != null && stream.peek() !== '"') {
                /* skip */            }
            return null;
        },
    };
    return CodeMirror.overlayMode(
        CodeMirror.getMode(config, parserConfig.backdrop || 'application/ld+json'),
        policySyntaxOverlay
    );
});
