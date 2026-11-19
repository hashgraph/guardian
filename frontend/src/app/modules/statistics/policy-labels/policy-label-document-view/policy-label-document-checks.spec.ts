import { IValidatorStep } from '@guardian/interfaces';
import { buildLabelChecks } from './policy-label-document-checks';

const item = (id: string, status?: boolean): any => ({ id, status });
const step = (validator: any, type: string, name: string, prefix = '1.1', title = 'Check'): IValidatorStep =>
    ({ item: validator, type, name, prefix, title, config: [] }) as any;

describe('buildLabelChecks', () => {
    it('returns nothing without steps', () => {
        expect(buildLabelChecks(undefined)).toEqual([]);
        expect(buildLabelChecks([])).toEqual([]);
    });

    it('does not make a check of a group or label node, which only emits a validate step', () => {
        const group = item('group');
        expect(buildLabelChecks([step(group, 'validate', 'Group', '1', 'Group')])).toEqual([]);
    });

    it('makes one check of a validator with three parts and its own validate step', () => {
        const rule = item('rule', true);
        const checks = buildLabelChecks([
            step(item('group'), 'validate', 'Group', '1', 'Group'),
            step(rule, 'variables', 'Overview', '1.1', 'Rule'),
            step(rule, 'scores', 'Scores', '1.1', 'Rule'),
            step(rule, 'formulas', 'Statistics', '1.1', 'Rule'),
            step(rule, 'validate', 'Rule', '1.1', 'Rule')
        ]);
        expect(checks.length).toBe(1);
        expect(checks[0].id).toBe('rule');
        expect(checks[0].prefix).toBe('1.1');
        expect(checks[0].title).toBe('Rule');
        expect(checks[0].parts.map((part) => part.name)).toEqual(['Overview', 'Scores', 'Statistics']);
    });

    it('keeps the order of the checks', () => {
        const a = item('a');
        const b = item('b');
        const checks = buildLabelChecks([
            step(a, 'variables', 'Overview'),
            step(a, 'validate', 'A'),
            step(b, 'formulas', 'Statistics'),
            step(b, 'validate', 'B')
        ]);
        expect(checks.map((check) => check.id)).toEqual(['a', 'b']);
    });

    it('maps the status', () => {
        const checks = buildLabelChecks([
            step(item('ok', true), 'variables', 'Overview'),
            step(item('bad', false), 'variables', 'Overview'),
            step(item('none'), 'variables', 'Overview')
        ]);
        expect(checks.map((check) => check.status)).toEqual(['ok', 'bad', 'none']);
    });
});
