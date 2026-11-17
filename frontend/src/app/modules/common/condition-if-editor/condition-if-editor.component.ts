import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SchemaField } from '@guardian/interfaces';
import { updateOverflowTitle } from 'src/app/utils/overflow-title';

export interface ConditionFieldOption {
    pathStr: string;
    label: string;
    /** Full path label (parent schemas › field); shown as tooltip and searched by the filter. */
    fullLabel?: string;
}

export interface ConditionFieldGroup {
    label: string;
    /** Schema name of the group header; `label` is used when absent. */
    name?: string;
    parents?: string;
    items: ConditionFieldOption[];
}

/**
 * Editor of an IF condition (single predicate, IF ALL or IF ANY).
 * Shared by the schema designer and the formulas editor. The condition object is edited
 * in place and `ifConditionChange` is emitted after every change.
 */
@Component({
    selector: 'app-condition-if-editor',
    templateUrl: './condition-if-editor.component.html',
    styleUrls: ['./condition-if-editor.component.scss'],
    standalone: false
})
export class ConditionIfEditorComponent {
    @Input() ifCondition: any;
    @Input() fieldGroups: ConditionFieldGroup[] = [];
    @Input() resolveField!: (pathStr: string) => SchemaField | null;
    @Input() resolveFieldPath?: (row: any) => string;
    @Input() firstEntry?: () => { field: SchemaField; fieldPath: string[] } | null;
    @Input() disabled = false;
    @Input() fieldPanelStyleClass = 'guardian-dropdown-panel width-825 sc-cond-panel';

    @Output() ifConditionChange = new EventEmitter<any>();

    public updateOverflowTitle(event: MouseEvent, text: string): void {
        updateOverflowTitle(event, text);
    }

    private emitChange(): void {
        this.ifConditionChange.emit(this.ifCondition);
    }

    public getRowFieldPath(row: any): string {
        if (this.resolveFieldPath) {
            return this.resolveFieldPath(row);
        }
        return row?.fieldPath?.length ? row.fieldPath.join('.') : (row?.field?.name ?? '');
    }

    public getIfOperator(): 'SINGLE' | 'AND' | 'OR' {
        const ic = this.ifCondition as any;
        if (!ic) { return 'SINGLE'; }
        if ('AND' in ic) { return 'AND'; }
        if ('OR' in ic) { return 'OR'; }
        return 'SINGLE';
    }

    public getIfRows(): any[] {
        const ic = this.ifCondition as any;
        if (!ic) { return [{ field: null, fieldValue: '' }]; }
        if ('AND' in ic) { return ic.AND || []; }
        if ('OR' in ic) { return ic.OR || []; }
        return [ic];
    }

    public setConditionOperator(op: 'SINGLE' | 'AND' | 'OR'): void {
        if (this.disabled) { return; }
        const rows = this.getIfRows();
        const firstEntry = this.firstEntry?.() ?? null;
        // getIfRows returns a placeholder row for a null ifCondition, so an existing row is
        // only usable when it actually carries a field; otherwise fall back to the first entry.
        const existing = rows[0]?.field ? rows[0] : null;
        const first = existing ?? {
            field: firstEntry?.field,
            fieldValue: '',
            ...(firstEntry && firstEntry.fieldPath.length > 1 ? { fieldPath: firstEntry.fieldPath } : {}),
        };
        const predicate = {
            field: first.field,
            fieldValue: first.fieldValue,
            ...(Array.isArray(first.fieldPath) && first.fieldPath.length > 1 ? { fieldPath: first.fieldPath } : {}),
            ...(first.comparator ? { comparator: first.comparator } : {}),
        };
        if (op === 'SINGLE') {
            this.ifCondition = predicate;
        } else if (op === 'AND') {
            this.ifCondition = { AND: [predicate] };
        } else {
            this.ifCondition = { OR: [predicate] };
        }
        this.emitChange();
    }

    public getIfRowValue(row: any): any { return row?.fieldValue ?? ''; }
    public isIfRowEnum(row: any): boolean { return !!(row?.field?.enum?.length); }
    public getIfRowOptions(row: any): string[] { return row?.field?.enum ?? []; }

    // 'equals' (including absent, its default) is one universal comparator for every field -
    // array or scalar alike. No legacy carve-out: an array-field '=' predicate saved before
    // this feature existed means exactly the same "each element equals" as one authored today.
    public getIfRowComparator(row: any): string {
        return row?.comparator || 'equals';
    }

    public getIfRowComparatorOptions(row: any): { label: string; value: string }[] {
        const isArrayField = !!(row?.field?.isArray && !row?.field?.isRef);
        if (!isArrayField) {
            return [{ label: '=', value: 'equals' }];
        }
        return [
            { label: '= (each)', value: 'equals' },
            { label: 'contains', value: 'contains' },
        ];
    }

    public setIfRowComparator(rowIdx: number, comparator: string): void {
        if (this.disabled) { return; }
        const ic = this.ifCondition as any;
        if (!ic) { return; }
        const apply = (row: any) => {
            if (!row) { return; }
            if (comparator === 'equals') { delete row.comparator; }
            else { row.comparator = comparator; }
        };
        if ('AND' in ic) { apply(ic.AND[rowIdx]); }
        else if ('OR' in ic) { apply(ic.OR[rowIdx]); }
        else { apply(ic); }
        this.emitChange();
    }

    public setIfRowField(rowIdx: number, pathStr: string): void {
        if (this.disabled) { return; }
        const field = this.resolveField(pathStr);
        if (!field) { return; }
        const fieldPath = pathStr.split('.');
        const predicate = {
            field,
            fieldValue: '',
            ...(fieldPath.length > 1 ? { fieldPath } : {}),
        };
        const ic = this.ifCondition as any;
        if (ic && 'AND' in ic) { ic.AND[rowIdx] = predicate; }
        else if (ic && 'OR' in ic) { ic.OR[rowIdx] = predicate; }
        else { this.ifCondition = predicate; }
        this.emitChange();
    }

    public setIfRowValue(rowIdx: number, value: any): void {
        if (this.disabled) { return; }
        const ic = this.ifCondition as any;
        if (!ic) { return; }
        if ('AND' in ic) { ic.AND[rowIdx].fieldValue = value; }
        else if ('OR' in ic) { ic.OR[rowIdx].fieldValue = value; }
        else { ic.fieldValue = value; }
        this.emitChange();
    }

    public addIfRow(): void {
        if (this.disabled) { return; }
        const ic = this.ifCondition as any;
        if (!ic) { return; }
        const firstEntry = this.firstEntry?.() ?? null;
        const newRow = {
            field: firstEntry?.field ?? null,
            fieldValue: '',
            ...(firstEntry && firstEntry.fieldPath.length > 1 ? { fieldPath: firstEntry.fieldPath } : {}),
        };
        if ('AND' in ic) { ic.AND.push(newRow); }
        else if ('OR' in ic) { ic.OR.push(newRow); }
        this.emitChange();
    }

    public removeIfRow(rowIdx: number): void {
        if (this.disabled) { return; }
        const ic = this.ifCondition as any;
        if (!ic) { return; }
        if ('AND' in ic && ic.AND.length > 1) { ic.AND.splice(rowIdx, 1); }
        else if ('OR' in ic && ic.OR.length > 1) { ic.OR.splice(rowIdx, 1); }
        this.emitChange();
    }
}
