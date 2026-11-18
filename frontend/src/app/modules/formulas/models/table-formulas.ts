import { ITableFormulaAction, ITableFormulaActions } from '../../common/table-dialog/table-formula-actions';
import { FormulasTree, IFormulaConditionContext } from './formula-tree';
import { IFormulaTarget } from './formula-target';

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
        const source = this.source();
        if (!this.columns.has(key) || !source?.tree.get(source.schema, source.path, source.context, { columnKey: key }).length) {
            return null;
        }
        let action = this.actions.get(key);
        if (!action) {
            action = {
                label: `Show formulas for ${this.columns.get(key)}`,
                open: () => {
                    const current = this.source();
                    if (current && this.column(key)) {
                        this.open({ ...current, columnKey: key });
                    }
                }
            };
            this.actions.set(key, action);
        }
        return action;
    }
}
