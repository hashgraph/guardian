import { Component, Input } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { FormulaItem } from '../models/formula-tree';
import { formulaTypeName } from '../models/formula-meta';
import { FormFormulas } from '../models/form-formulas';
import { FormulasViewDialog } from '../dialogs/formulas-view-dialog/formulas-view-dialog.component';

/**
 * Collapsible card with the formulas linked to a request-form field.
 */
@Component({
    selector: 'app-field-formulas',
    templateUrl: './field-formulas.component.html',
    styleUrls: ['./field-formulas.component.scss'],
    standalone: false
})
export class FieldFormulasComponent {
    @Input() items: FormulaItem[] = [];
    @Input() model!: FormFormulas;
    @Input() fullPath!: string;
    @Input() entries?: Record<string, number> | null;

    private expanded = new Set<string>();

    constructor(private dialogService: DialogService) {
    }

    public isExpanded(item: FormulaItem): boolean {
        return this.expanded.has(item.uuid);
    }

    public toggle(item: FormulaItem): void {
        if (this.expanded.has(item.uuid)) {
            this.expanded.delete(item.uuid);
        } else {
            this.expanded.add(item.uuid);
        }
    }

    public trackItem(index: number, item: FormulaItem): string {
        return item.uuid;
    }

    public typeLabel(item: FormulaItem): string {
        return formulaTypeName(item.type);
    }

    public openDetails(event: Event, item?: FormulaItem): void {
        event.stopPropagation();
        const field = this.model?.fields[this.fullPath];
        if (!field) {
            return;
        }
        this.dialogService.open(FormulasViewDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                tree: field.tree,
                schema: field.schema,
                path: field.path,
                context: this.model.context(this.entries),
                itemId: item?.uuid,
                origin: 'form'
            },
        });
    }
}
