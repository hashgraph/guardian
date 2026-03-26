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

    private static readonly POST_PARAMS: { name: string; type: string; description: string }[] = [
        { name: 'timeout', type: 'number', description: 'Request timeout in ms (default: 60000)' },
        { name: 'waitRemotePolicy', type: 'boolean', description: 'Wait for remote policy response (default: true)' },
    ];

    private static readonly GET_PARAMS_BY_BLOCK_TYPE: Record<string, { name: string; type: string; description: string }[]> = {
        interfaceDocumentsSourceBlock: [
            { name: 'page', type: 'number', description: 'Page number (0-based)' },
            { name: 'itemsPerPage', type: 'number', description: 'Items per page' },
            { name: 'sortField', type: 'string', description: 'Field name to sort by' },
            { name: 'sortDirection', type: 'string', description: 'Sort direction (asc/desc)' },
            { name: 'filterByUUID', type: 'string', description: 'Filter by document UUID' },
            { name: 'savepointIds', type: 'string[]', description: 'Savepoint IDs filter (JSON array)' },
        ],
        dataTransformationAddon: [
            { name: 'filterByUUID', type: 'string', description: 'Filter by document UUID' },
        ],
    };

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
        if (entry.target) {
            const block = this.blocks.find((b: any) => b.tag === entry.target);
            entry.blockType = block?.blockType || '';
            if (!entry.name) {
                entry.name = entry.target;
            }
            if (!entry.alias) {
                entry.alias = entry.target.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            }
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

    getQueryParams(entry: IPolicyDocumentationEntry): { name: string; type: string; description: string }[] {
        if (entry.method === 'POST') {
            return PolicyApiConfigDialogComponent.POST_PARAMS;
        }
        if (!entry.target) {
            return [];
        }
        const block = this.blocks.find((b: any) => b.tag === entry.target);
        if (!block) {
            return [];
        }
        return PolicyApiConfigDialogComponent.GET_PARAMS_BY_BLOCK_TYPE[block.blockType] || [];
    }

    onExport(): void {
        const data = JSON.stringify(this.entries, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api-config-${this.policyId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    onImport(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) {
            return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result as string);
                if (Array.isArray(imported)) {
                    this.entries = imported.map((e: any) => ({
                        name: e.name || '',
                        description: e.description || '',
                        target: e.target || '',
                        method: e.method || 'GET',
                        alias: e.alias || '',
                        url: e.url || '',
                        dmrvUrl: e.dmrvUrl || '',
                        blockType: e.blockType || '',
                    }));
                    this.revalidate();
                }
            } catch {
                // invalid JSON — ignore
            }
        };
        reader.readAsText(file);
        input.value = '';
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
