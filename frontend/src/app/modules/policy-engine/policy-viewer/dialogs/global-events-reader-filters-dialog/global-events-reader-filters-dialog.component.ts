import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GlobalDocumentType } from "@guardian/interfaces";


export interface UiFilterItem {
    key: string;
    value: string;
}

export interface UiBranchState {
    branchEvent: string;
    documentType: GlobalDocumentType;
    schemaId: string | null;
    schemaName: string | null;
    items: UiFilterItem[];
}

export interface FiltersDialogResult {
    filterFieldsByBranch: Record<string, Record<string, string>>;
    branchDocumentTypeByBranch: Record<string, GlobalDocumentType>;
}

@Component({
    selector: 'global-events-reader-filters-dialog',
    templateUrl: './global-events-reader-filters-dialog.component.html',
    styleUrls: ['./global-events-reader-filters-dialog.component.scss'],
})
export class GlobalEventsReaderFiltersDialogComponent {
    public readonly: boolean = false;
    public documentTypes: Array<{ label: string; value: GlobalDocumentType }> = [];
    public branches: UiBranchState[] = [];

    constructor(
        private readonly dialogRef: DynamicDialogRef,
        private readonly dialogConfig: DynamicDialogConfig,
    ) {
        const data = this.dialogConfig?.data || {};

        this.readonly = data.readonly;
        this.documentTypes = data.documentTypes ?? [];

        const inputBranches = data.branches ?? [];
        const filterFieldsByBranch = data.filterFieldsByBranch || {};
        const branchDocumentTypeByBranch = data.branchDocumentTypeByBranch || {};

        this.branches = inputBranches
            .map((b: any) => {
                const branchEvent = b?.branchEvent;
                if (!branchEvent) {
                    return null;
                }

                const type = this.normalizeDocumentType(
                    String(branchDocumentTypeByBranch[branchEvent] ?? b?.documentType),
                );

                const raw = filterFieldsByBranch[branchEvent] || {};
                const items: UiFilterItem[] = Object.keys(raw).map((k) => {
                    return {
                        key: k,
                        value: raw[k],
                    };
                });

                return {
                    branchEvent,
                    documentType: type,
                    schemaId: b?.schema ?? null,
                    schemaName: b?.schemaName ?? null,
                    items,
                };
            })
            .filter((x: any) => !!x);
    }

    private normalizeDocumentType(value: string): GlobalDocumentType {
        const v = String(value ?? '').toLowerCase().trim();

        if (v === 'vc') {
            return 'vc';
        }
        if (v === 'json') {
            return 'json';
        }
        if (v === 'csv') {
            return 'csv';
        }
        if (v === 'text') {
            return 'text';
        }
        return 'any';
    }

    public addFilterItem(branch: UiBranchState): void {
        if (!branch) {
            return;
        }
        if (!branch.schemaId) {
            return;
        }
        if (this.readonly) {
            return;
        }
        if (branch.documentType !== 'vc') {
            return;
        }

        branch.items = [...branch.items, { key: '', value: '' }];
    }

    public removeFilterItem(branch: UiBranchState, index: number): void {
        if (!branch) {
            return;
        }
        if (this.readonly) {
            return;
        }
        if (index < 0 || index >= branch.items.length) {
            return;
        }

        const copy = [...branch.items];
        copy.splice(index, 1);
        branch.items = copy;
    }

    public onCancel(): void {
        this.dialogRef.close(null);
    }

    public onApply(): void {
        const filterFieldsByBranch: Record<string, Record<string, string>> = {};
        const branchDocumentTypeByBranch: Record<string, GlobalDocumentType> = {};

        for (const branch of this.branches) {
            const branchEvent = branch?.branchEvent;
            if (!branchEvent) {
                continue;
            }

            branchDocumentTypeByBranch[branchEvent] = branch.documentType;

            if (branch.documentType !== 'vc') {
                continue;
            }

            const obj: Record<string, string> = {};
            for (const item of branch.items || []) {
                const key = item?.key;
                const value = item?.value ?? '' ;

                if (!key) {
                    continue;
                }

                obj[key] = value;
            }

            if (Object.keys(obj).length > 0) {
                filterFieldsByBranch[branchEvent] = obj;
            }
        }

        const result: FiltersDialogResult = {
            filterFieldsByBranch,
            branchDocumentTypeByBranch,
        };

        this.dialogRef.close(result);
    }
}
