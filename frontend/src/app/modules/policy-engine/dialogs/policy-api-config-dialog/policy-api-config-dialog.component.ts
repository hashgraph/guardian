import { Component, ElementRef, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IPolicyDocumentationEntry } from '@guardian/interfaces';

@Component({
    selector: 'app-policy-api-config-dialog',
    templateUrl: './policy-api-config-dialog.component.html',
    styleUrls: ['./policy-api-config-dialog.component.scss'],
})
export class PolicyApiConfigDialogComponent {
    public entries: IPolicyDocumentationEntry[] = [];
    public blocks: any[] = [];
    public root: any;
    public policyId: string;
    public methods = [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
    ];
    public validationErrors: Map<number, string> = new Map();
    public isLargeSize = true;

    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.policyId = this.config.data?.policyId || '';
        this.blocks = this.config.data?.blocks || [];
        this.root = this.config.data?.root;
        const existing: IPolicyDocumentationEntry[] = this.config.data?.entries || [];
        this.entries = existing.map((e) => ({ ...e }));
    }

    addEntry(): void {
        this.entries.push({
            name: '',
            description: '',
            target: '',
            method: 'GET',
            alias: '',
            url: '',
            dmrvUrl: '',
        });
    }

    removeEntry(index: number): void {
        this.entries.splice(index, 1);
        this.validationErrors.delete(index);
        this.revalidate();
    }

    onTargetChange(index: number): void {
        const entry = this.entries[index];
        if (entry.target && !entry.name) {
            entry.name = entry.target;
        }
        if (entry.target && !entry.alias) {
            entry.alias = entry.target.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        }
        this.revalidate();
    }

    onAliasChange(index: number): void {
        const entry = this.entries[index];
        entry.alias = entry.alias.toLowerCase().replace(/[^a-z0-9-]/g, '');
        this.revalidate();
    }

    getPreviewUrl(entry: IPolicyDocumentationEntry): string {
        if (!entry.alias) {
            return '';
        }
        return `/api/v1/dmrv/${this.policyId}/${entry.alias}`;
    }

    private revalidate(): void {
        this.validationErrors.clear();
        const aliasSet = new Map<string, number>();
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            if (!entry.target) {
                this.validationErrors.set(i, 'Block is required');
                continue;
            }
            if (!entry.alias) {
                this.validationErrors.set(i, 'Alias is required');
                continue;
            }
            if (!/^[a-z0-9-]+$/.test(entry.alias)) {
                this.validationErrors.set(i, 'Alias: only lowercase letters, digits and hyphens');
                continue;
            }
            const key = `${entry.alias}:${entry.method}`;
            if (aliasSet.has(key)) {
                this.validationErrors.set(i, `Duplicate alias+method (same as row ${(aliasSet.get(key) as number) + 1})`);
                continue;
            }
            aliasSet.set(key, i);
        }
    }

    onSave(): void {
        this.revalidate();
        if (this.validationErrors.size > 0) {
            return;
        }
        this.ref.close(this.entries);
    }

    onClose(): void {
        this.ref.close(null);
    }

    toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh';
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
