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
    /** A field of a submitted document: used instead of `model` in the read-only view. */
    @Input() source?: { tree: any; schema: string; path: string; context?: any; origin?: 'form' | 'document' } | null;

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
        let data: any;
        if (this.source) {
            data = { origin: 'document', ...this.source };
        } else {
            const field = this.model?.fields[this.fullPath];
            if (!field) {
                return;
            }
            data = {
                tree: field.tree,
                schema: field.schema,
                path: field.path,
                context: this.model.context(this.entries),
                origin: 'form'
            };
        }
        this.dialogService.open(FormulasViewDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: { ...data, itemId: item?.uuid },
        });
    }
}
