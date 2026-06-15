import { Component, ElementRef, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IPolicyDocumentationEntry, POLICY_ALIAS_REGEX } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { RegisteredService } from '../../services/registered.service';
import { IBlockAbout, PolicyFolder, PolicyItem } from '../../structures';

@Component({
    selector: 'app-policy-api-config-dialog',
    templateUrl: './policy-api-config-dialog.component.html',
    styleUrls: ['./policy-api-config-dialog.component.scss'],
    standalone: false
})
export class PolicyApiConfigDialogComponent {
    public entries: IPolicyDocumentationEntry[] = [];
    public blocks: any[] = [];
    public eligibleBlocks: any[] = [];
    public root!: PolicyFolder;
    public policyId: string;
    public methods = [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'BOTH', value: 'Both' },
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
        public config: DynamicDialogConfig,
        private registeredService: RegisteredService,
        private informService: InformService
    ) {
        this.policyId = this.config.data?.policyId ?? '';
        this.blocks = this.config.data?.blocks ?? [];
        this.root = this.config.data?.root;
        this.eligibleBlocks = this.blocks.filter((block: any) => this.isApiCapableBlock(block));
        const existing: IPolicyDocumentationEntry[] = this.config.data?.entries ?? [];
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

    addAllEntries(): void {
        const coverageByBlockTag = new Map<string, Set<string>>();
        for (const entry of this.entries) {
            if (!entry.target) {
                continue;
            }
            const coveredMethods = coverageByBlockTag.get(entry.target) ?? new Set<string>();
            if (entry.method === 'Both') {
                coveredMethods.add('GET');
                coveredMethods.add('POST');
            } else if (entry.method) {
                coveredMethods.add(entry.method);
            }
            coverageByBlockTag.set(entry.target, coveredMethods);
        }

        const newEntries: IPolicyDocumentationEntry[] = [];
        for (const block of this.eligibleBlocks) {
            if (!block?.tag) {
                continue;
            }
            const about = this.getBlockAbout(block);
            const coveredMethods = coverageByBlockTag.get(block.tag) ?? new Set<string>();
            const needsGet = !!about?.get && !coveredMethods.has('GET');
            const needsPost = !!about?.post && !coveredMethods.has('POST');
            if (!needsGet && !needsPost) {
                continue;
            }
            const methodToAdd = (needsGet && needsPost) ? 'Both' : (needsGet ? 'GET' : 'POST');
            newEntries.push({
                name: block.tag,
                description: '',
                target: block.tag,
                method: methodToAdd,
                alias: block.tag.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                url: '',
                dmrvUrl: '',
                blockType: block.blockType || '',
            });
        }

        if (newEntries.length > 0) {
            this.entries.push(...newEntries);
            this.revalidate();
        }
    }

    removeEntry(index: number): void {
        this.entries.splice(index, 1);
        this.validationErrors.delete(index);
        this.revalidate();
    }

    onTargetChange(index: number): void {
        const entry = this.entries[index];
        if (entry.target) {
            const block = this.getBlockByTag(entry.target);
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
        entry.alias = entry.alias.toLowerCase().replace(/[^a-z0-9\-/]/g, '');
        this.revalidate();
    }

    onMethodChange(): void {
        this.revalidate();
    }

    getPreviewUrl(entry: IPolicyDocumentationEntry): string {
        if (!entry.alias) {
            return '';
        }
        return `/api/v1/dmrv/${this.policyId}/${entry.alias}`;
    }

    private isApiCapableBlock(block: any): boolean {
        if (!block?.tag) {
            return false;
        }
        const about = this.registeredService.getAbout(block, this.root);
        return !!(about?.get || about?.post);
    }

    private getBlockAbout(block: any): IBlockAbout | null {
        return this.registeredService.getAbout(block, this.root);
    }

    private getBlockByTag(tag: string): any {
        return this.blocks.find((block: any) => block.tag === tag);
    }

    private revalidate(): void {
        this.validationErrors.clear();
        const targetMethods = new Map<string, { index: number; method: string }[]>();
        const aliasMethods  = new Map<string, { index: number; method: string }[]>();
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const block = this.getBlockByTag(entry.target);
            const about = block ? this.getBlockAbout(block) : null;
            const entryError = this.validateEntry(entry, block, about);
            if (entryError) {
                this.validationErrors.set(i, entryError);
                continue;
            }

            const existingMethods = targetMethods.get(entry.target) ?? [];
            const conflictingEntry = existingMethods.find((item) =>
                item.method === entry.method ||
                item.method === 'Both' ||
                entry.method === 'Both'
            );
            if (conflictingEntry) {
                this.validationErrors.set(i, `Conflicting block/method (same as row ${conflictingEntry.index + 1})`);
                continue;
            }

            const existingAliasMethods = aliasMethods.get(entry.alias) ?? [];
            const aliasConflict = existingAliasMethods.find((item) =>
                item.method === entry.method ||
                item.method === 'Both' ||
                entry.method === 'Both'
            );
            if (aliasConflict) {
                this.validationErrors.set(i, `Conflicting alias/method (same as row ${aliasConflict.index + 1})`);
                continue;
            }

            existingMethods.push({ index: i, method: entry.method });
            targetMethods.set(entry.target, existingMethods);
            existingAliasMethods.push({ index: i, method: entry.method });
            aliasMethods.set(entry.alias, existingAliasMethods);
        }
    }

    private validateEntry(entry: IPolicyDocumentationEntry, block: PolicyItem | undefined, about: IBlockAbout | null): string | null {
        if (!entry.target) {
            return 'Block is required';
        }
        if (!entry.alias) {
            return 'Alias is required';
        }
        if (!POLICY_ALIAS_REGEX.test(entry.alias)) {
            return "Alias: lowercase letters, digits, hyphens; use '/' to separate path segments";
        }
        if (!block || !about || (!about.get && !about.post)) {
            return 'Selected block does not support API aliases';
        }
        if (entry.method === 'GET' && !about.get) {
            return 'Selected block does not support GET';
        }
        if (entry.method === 'POST' && !about.post) {
            return 'Selected block does not support POST';
        }
        if (entry.method === 'Both' && (!about.get || !about.post)) {
            return 'Selected block must support both GET and POST for Both';
        }
        return null;
    }

    getGetParams(entry: IPolicyDocumentationEntry): { name: string; type: string; description: string }[] {
        if (entry.method === 'POST' || !entry.target) {
            return [];
        }
        const block = this.blocks.find((b: any) => b.tag === entry.target);
        return block ? (PolicyApiConfigDialogComponent.GET_PARAMS_BY_BLOCK_TYPE[block.blockType] || []) : [];
    }

    getPostParams(entry: IPolicyDocumentationEntry): { name: string; type: string; description: string }[] {
        if (entry.method === 'GET') {
            return [];
        }
        return PolicyApiConfigDialogComponent.POST_PARAMS;
    }

    hasParams(entry: IPolicyDocumentationEntry): boolean {
        return this.getGetParams(entry).length > 0 || this.getPostParams(entry).length > 0;
    }

    onExport(): void {
        this.revalidate();
        const validEntries = this.entries.filter((_, i) => !this.validationErrors.has(i));
        const data = JSON.stringify(validEntries, null, 2);
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
            let imported: unknown;
            try {
                imported = JSON.parse(reader.result as string);
            } catch {
                this.informService.errorShortMessage(
                    'Could not parse the selected file. Expected a JSON array exported from this dialog.',
                    'Import failed'
                );
                return;
            }
            if (!Array.isArray(imported)) {
                this.informService.errorShortMessage(
                    'Unexpected file contents. Expected a JSON array of API entries.',
                    'Import failed'
                );
                return;
            }
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
        };
        reader.onerror = () => {
            this.informService.errorShortMessage(
                'Could not read the selected file.',
                'Import failed'
            );
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
                        dialogEl.style.width = '70vw';
                        dialogEl.style.maxWidth = '70vw';
                    } else {
                        dialogEl.style.width = '45vw';
                        dialogEl.style.maxWidth = '45vw';
                    }
                    dialogEl.style.maxHeight = '90vh';
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
