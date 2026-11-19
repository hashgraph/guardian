import { IValidatorStep } from '@guardian/interfaces';
import { IRailSection } from '../../../schema-engine/schema-form-rail/schema-form-rail.component';

const PART_TYPES = ['variables', 'scores', 'formulas'];

/** A rule or statistic validator of the label: one page of the document view. */
export interface ILabelCheck extends IRailSection {
    status: 'ok' | 'bad' | 'none';
    /** The Overview, Scores and Statistics steps of the validator, in order. */
    parts: IValidatorStep[];
}

export function checkStatus(status: boolean | undefined): 'ok' | 'bad' | 'none' {
    return status === true ? 'ok' : status === false ? 'bad' : 'none';
}

/**
 * Groups consecutive steps of one validator. A group that holds a variables, scores or formulas
 * step is a check. Group and label nodes only emit a `validate` step, so they are not checks:
 * their numbering shows in the `prefix` of their children.
 */
export function buildLabelChecks(steps: IValidatorStep[] | undefined): ILabelCheck[] {
    const checks: ILabelCheck[] = [];
    let group: IValidatorStep[] = [];
    const flush = () => {
        const parts = group.filter((step) => PART_TYPES.includes(step.type));
        if (parts.length) {
            const first = parts[0];
            checks.push({
                id: first.item.id,
                prefix: first.prefix,
                title: first.title,
                status: checkStatus(first.item.status),
                parts
            });
        }
        group = [];
    };
    for (const step of steps || []) {
        if (group.length && group[0].item !== step.item) {
            flush();
        }
        group.push(step);
    }
    flush();
    return checks;
}

/** A group of the label: it has no page, only a result that follows its rule ("all" or "one of"). */
export interface ILabelGroup {
    id: string;
    prefix?: string;
    title: string;
    status: 'ok' | 'bad' | 'none';
}

/** The `validate` steps of the items that have no variables, scores or formulas: the groups. */
export function buildLabelGroups(steps: IValidatorStep[] | undefined): ILabelGroup[] {
    const list = steps || [];
    const checked = new Set(list.filter((step) => PART_TYPES.includes(step.type)).map((step) => step.item));
    return list
        .filter((step) => step.type === 'validate' && !checked.has(step.item))
        .map((step) => ({
            id: step.item.id,
            prefix: step.prefix,
            title: step.title,
            status: checkStatus(step.item.status)
        }));
}
