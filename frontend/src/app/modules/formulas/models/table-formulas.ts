import { ITableFormulaAction, ITableFormulaActions } from '../../common/table-dialog/table-formula-actions';
import { FormulasTree, IFormulaConditionContext } from './formula-tree';
import { formulaTargetKey, IFormulaTarget } from './formula-target';

export interface IFormulaFieldSource {
    tree: FormulasTree;
    schema: string;
    path: string;
    context?: IFormulaConditionContext;
    origin?: 'form' | 'document';
}

export class TableFormulas implements ITableFormulaActions {
    private readonly actions = new Map<string, ITableFormulaAction>();
    private readonly columns: Map<string, string>;

    constructor(
        private readonly source: () => IFormulaFieldSource | null | undefined,
        columns: { key: string; name: string }[],
        private readonly open: (source: IFormulaFieldSource & IFormulaTarget) => void
    ) {
        this.columns = new Map(columns.map(column => [column.key, column.name]));
    }

    public column(key: string): ITableFormulaAction | null {
        return this.action({ columnKey: key });
    }

    public cell(key: string, rowIndex: number, tableIndex?: number): ITableFormulaAction | null {
        return this.action({ columnKey: key, rowIndex, ...(tableIndex === undefined ? {} : { tableIndex }) });
    }

    private action(target: IFormulaTarget & { columnKey: string }): ITableFormulaAction | null {
        const source = this.source();
        const key = target.columnKey;
        if ((target.rowIndex !== undefined && source?.origin === 'form') || !this.columns.has(key) || !source?.tree.get(source.schema, source.path, source.context, target).length) {
            return null;
        }
        const cacheKey = formulaTargetKey('', target);
        let action = this.actions.get(cacheKey);
        if (!action) {
            action = {
                label: `Show formulas for ${this.columns.get(key)}${target.rowIndex === undefined ? '' : `, row ${target.rowIndex + 1}`}`,
                open: () => {
                    const current = this.source();
                    if (current && this.action(target)) {
                        this.open({ ...current, ...target });
                    }
                }
            };
            this.actions.set(cacheKey, action);
        }
        return action;
    }
}
