import { Component, ElementRef, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ModuleStatus } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SchemaTemplatesService } from 'src/app/services/schema-templates.service';

@Component({
    selector: 'search-schema-template-dialog',
    templateUrl: './search-schema-template-dialog.component.html',
    styleUrls: ['./search-schema-template-dialog.component.scss'],
    standalone: false
})
export class SearchSchemaTemplateDialog {
    public loading = false;
    public name = '';
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl(''),
    });
    public list: any[] = [];
    public isLargeSize = true;
    public pageIndex = 0;
    public pageSize = 25;
    public count = 0;

    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    constructor(
        public ref: DynamicDialogRef,
        private readonly schemaTemplatesService: SchemaTemplatesService,
        public config: DynamicDialogConfig,
    ) {
        this.name = this.config.data?.name || '';
        this.filtersForm.setValue({ name: this.name });
    }

    ngOnInit(): void {
        this.load();
    }

    public load(): void {
        this.loading = true;
        // The name filter is applied by the server, so the grid can page through every
        // match instead of filtering whatever happened to land on the first page.
        this.schemaTemplatesService
            .page(this.pageIndex, this.pageSize, this.filtersForm.value?.name || '')
            .subscribe((response) => {
                this.list = response.body || [];
                const header = response.headers.get('X-Total-Count');
                const total = header === null ? NaN : Number(header);
                this.count = Number.isFinite(total) && total >= 0
                    ? total
                    // No header: assume at least what has been paged through so far,
                    // rather than collapsing to one page and stranding the user.
                    : this.pageIndex * this.pageSize + this.list.length;
                this.loading = false;
            }, () => {
                this.list = [];
                this.count = 0;
                this.loading = false;
            });
    }

    public onFilters(): void {
        this.pageIndex = 0;
        this.load();
    }

    public onPage(event: any): void {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.load();
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSelect(template: any): void {
        this.ref.close(template);
    }

    public getStatusLabel(status?: ModuleStatus): string {
        switch (status) {
            case ModuleStatus.PUBLISHED:
                return 'Published';
            case ModuleStatus.PUBLISH_ERROR:
                return 'Publish Error';
            case ModuleStatus.DRY_RUN:
                return 'Dry Run';
            case ModuleStatus.DRAFT:
            default:
                return 'Draft';
        }
    }

    public getStatusColor(status?: ModuleStatus): string {
        switch (status) {
            case ModuleStatus.PUBLISHED:
                return 'green';
            case ModuleStatus.PUBLISH_ERROR:
                return 'red';
            case ModuleStatus.DRY_RUN:
                return 'blue';
            case ModuleStatus.DRAFT:
            default:
                return 'grey';
        }
    }

    public toggleSize(): void {
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
