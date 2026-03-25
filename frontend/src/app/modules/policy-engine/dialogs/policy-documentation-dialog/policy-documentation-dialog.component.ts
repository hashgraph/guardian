import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-policy-documentation-dialog',
    templateUrl: './policy-documentation-dialog.component.html',
    styleUrls: ['./policy-documentation-dialog.component.scss'],
})
export class PolicyDocumentationDialogComponent implements OnInit {
    public loading = true;
    public title: string;
    public entries: any[] = [];
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
        this.title = this.config.header || 'Policy Documentation';
        this.entries = this.config.data?.entries || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.ref.close(false);
    }

    getQueryParams(entry: any): { name: string; type: string; description: string }[] {
        if (entry.method === 'POST') {
            return PolicyDocumentationDialogComponent.POST_PARAMS;
        }
        return PolicyDocumentationDialogComponent.GET_PARAMS_BY_BLOCK_TYPE[entry.blockType] || [];
    }

    copyUrl(url: string): void {
        navigator.clipboard.writeText(url);
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
