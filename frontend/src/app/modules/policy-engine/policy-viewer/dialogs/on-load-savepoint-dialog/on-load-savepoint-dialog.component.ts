import { Component } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

export interface ISavepointItem {
    id: string;
    name: string;
    createDate?: string | Date;
    isCurrent?: boolean;
}

@Component({
    selector: 'app-restore-onload-dialog',
    templateUrl: './on-load-savepoint-dialog.component.html',
    styleUrls: ['./on-load-savepoint-dialog.component.scss']
})
export class OnLoadSavepointDialog {
    policyId!: string;
    items: ISavepointItem[] = [];
    selectedId: string | null = null;
    applying = false;
    private currentSavepointId: string | null = null;

    constructor(
        private ref: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private policyEngine: PolicyEngineService
    ) {
        this.policyId = this.config.data?.policyId ?? '';
        this.currentSavepointId = this.config.data?.currentSavepointId ?? null;

        const incoming: ISavepointItem[] = Array.isArray(this.config.data?.items) ? this.config.data.items : [];
        this.items = [...incoming].sort((a, b) =>
            new Date(b.createDate || 0).getTime() - new Date(a.createDate || 0).getTime()
        );

        const byFlag = this.items.find(i => (i as any).isCurrent || (i as any).isSelected)?.id ?? null;
        this.selectedId = this.currentSavepointId ?? byFlag ?? this.items[0]?.id ?? null;
    }

    trackById = (_: number, i: ISavepointItem) => i.id;

    selectRow(item: ISavepointItem) { this.selectedId = item.id; }

    onCancel() { this.ref.close({ type: 'close' }); }

    onRestore() {
        if (!this.selectedId || this.applying) return;
        this.applying = true;
        this.policyEngine.selectSavepoint(this.policyId, this.selectedId).subscribe({
            next: (res: { savepoint: ISavepointItem }) =>
                this.ref.close({ type: 'apply', savepoint: res.savepoint }),
            error: () => (this.applying = false),
            complete: () => (this.applying = false)
        });
    }
}
