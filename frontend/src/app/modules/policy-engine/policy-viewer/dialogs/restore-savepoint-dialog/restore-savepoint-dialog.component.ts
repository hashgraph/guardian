import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

export interface ISavepointItem {
    id: string;
    name: string;
    createDate?: string | Date;
    parentSavepointId?: string | null;
    savepointPath?: string[];
}

export type RestoreSavepointActionType =
    | 'apply'
    | 'delete'
    | 'deleteAll'
    | 'rename'
    | 'close';

export interface IRestoreSavepointAction {
    type: RestoreSavepointActionType;
    id?: string;
    name?: string;
}

@Component({
    selector: 'app-restore-savepoint-dialog',
    templateUrl: './restore-savepoint-dialog.component.html',
    styleUrls: ['./restore-savepoint-dialog.component.scss'],
})
export class RestoreSavepointDialog {
    public policyId!: string;
    public currentSavepointId: string | null = null;
    public items: ISavepointItem[] = [];

    public editingId: string | null = null;
    public editingName = '';
    private deletingIds = new Set<string>();
    public deletingAll = false;
    public renaming = false;

    constructor(
        private ref: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private policyEngine: PolicyEngineService
    ) {
        this.policyId = this.config.data?.policyId ?? '';
        this.currentSavepointId = this.config.data?.currentSavepointId ?? null;

        const incoming: ISavepointItem[] = Array.isArray(this.config.data?.items)
            ? this.config.data.items
            : [];

        this.items = [...incoming];
    }

    public trackById(_index: number, item: ISavepointItem): string {
        return item.id;
    }

    public onClose(): void {
        this.ref.close(<IRestoreSavepointAction>{ type: 'close' });
    }

    public onApply(item: ISavepointItem): void {
        this.ref.close(<IRestoreSavepointAction>{ type: 'apply', id: item.id });
    }

    public startRename(item: ISavepointItem): void {
        if (this.isBusy(item.id)) return;
        this.editingId = item.id;
        this.editingName = item.name ?? '';
    }

    public cancelRename(): void {
        if (this.renaming) return;
        this.editingId = null;
        this.editingName = '';
    }

    public saveRename(item: ISavepointItem): void {
        const name = this.editingName.trim();
        if (!this.editingId || !name || this.renaming) return;

        this.renaming = true;
        this.policyEngine.updateSavepoint(this.policyId, item.id, { name })
            .subscribe({
                next: () => {
                    const idx = this.items.findIndex(i => i.id === item.id);
                    if (idx >= 0) {
                        this.items[idx] = { ...this.items[idx], name };
                    }

                    this.ref.close(<IRestoreSavepointAction>{
                        type: 'rename',
                        id: item.id,
                        name
                    });
                },
                error: () => {
                    this.renaming = false;
                },
                complete: () => {
                    this.renaming = false;
                    this.editingId = null;
                    this.editingName = '';
                }
            });
    }

    public onDelete(item: ISavepointItem): void {
        if (this.isBusy(item.id)) return;
        this.deletingIds.add(item.id);

        this.policyEngine.deleteSavepoints(this.policyId, [item.id])
            .subscribe({
                next: () => {
                    this.items = this.items.filter(i => i.id !== item.id);

                    if (this.currentSavepointId === item.id) {
                        this.currentSavepointId = null;
                    }

                    this.ref.close(<IRestoreSavepointAction>{ type: 'delete', id: item.id });
                },
                error: () => {
                    this.deletingIds.delete(item.id);
                },
                complete: () => {
                    this.deletingIds.delete(item.id);
                }
            });
    }

    public onDeleteAll(): void {
        if (this.deletingAll || !this.items.length) return;

        this.deletingAll = true;
        const ids = this.items.map(i => i.id);

        this.policyEngine.deleteSavepoints(this.policyId, ids)
            .subscribe({
                next: () => {
                    this.items = [];
                    this.currentSavepointId = null;
                    this.ref.close(<IRestoreSavepointAction>{ type: 'deleteAll' });
                },
                error: () => {
                    this.deletingAll = false;
                },
                complete: () => {
                    this.deletingAll = false;
                }
            });
    }

    public isBusy(id: string): boolean {
        return this.deletingIds.has(id) || this.renaming;
    }
}
