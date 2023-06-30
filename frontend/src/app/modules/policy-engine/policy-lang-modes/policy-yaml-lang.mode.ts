import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/overlay';
import 'codemirror/mode/meta';
import CodeMirror, { Mode, StringStream } from 'codemirror';
import * as KeywordGroups from './keyword-groups';

CodeMirror.defineMode('policy-yaml-lang', function (config, parserConfig) {
    const isKeyword = new RegExp(
        '(' +
            `(${KeywordGroups.idGroupKeywords.join('|')})` +
            `|(${KeywordGroups.nameGroupKeywords.join('|')})` +
            `|(${KeywordGroups.typeGroupKeywords.join('|')})` +
            `|(${KeywordGroups.versionGroupKeywords.join('|')})` +
            `|(${KeywordGroups.userGroupKeywords.join('|')})` +
            `|(${KeywordGroups.tagGroupKeywords.join('|')})` +
            `|(${KeywordGroups.complexObjGroupKeywords.join('|')})` +
            `|(${KeywordGroups.simplePropertiesGroupKeywords.join('|')})` +
            `|(${KeywordGroups.dateGroupKeywords.join('|')})` +
            `|(${KeywordGroups.arrayGroupKeywords.join('|')})` +
            `|(${KeywordGroups.flagsGroupKeywords.join('|')})` +
            `|(${KeywordGroups.errorGroupKeywords.join('|')})` +
        ')'
    );
    const policySyntaxOverlay: Mode<any> = {
        startState: () => ({ hasSymbols: false }),
        token: function (stream: StringStream, state: any) {
            const keyword = stream.match(isKeyword);
            if (!state.hasSymbols && keyword && stream.match(/\s*\:/, false)) {
                if (keyword[2]) {
                    return 'policy-id';
                }
                if (keyword[3]) {
                    return 'policy-name';
                }
                if (keyword[4]) {
                    return 'policy-type';
                }
                if (keyword[5]) {
                    return 'policy-version';
                }
                if (keyword[6]) {
                    return 'policy-user';
                }
                if (keyword[7]) {
                    return 'policy-tag';
                }
                if (keyword[8]) {
                    return 'policy-complex';
                }
                if (keyword[9]) {
                    return 'policy-simple';
                }
                if (keyword[10]) {
                    return 'policy-date';
                }
                if (keyword[11]) {
                    return 'policy-array';
                }
                if (keyword[12]) {
                    return 'policy-flag';
                }
                if (keyword[13]) {
                    return 'policy-error';
                }
            }
            let ch = stream.next();
            while (ch != null && !stream.match(isKeyword, false)) {
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
