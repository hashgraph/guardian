import { Component, ElementRef, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
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
    public templates: any[] = [];
    public list: any[] = [];
    public isLargeSize = true;

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
        this.list = [];
        this.loading = true;
        this.schemaTemplatesService
            .page(0, 100, '')
            .subscribe((response) => {
                this.templates = response.body || [];
                for (const template of this.templates) {
                    template.search = template.name?.toLowerCase();
                }
                this.onFilters();
                this.loading = false;
            }, () => {
                this.templates = [];
                this.list = [];
                this.loading = false;
            });
    }

    public onFilters(): void {
        let name: string = this.filtersForm.value?.name;
        if (name) {
            name = name.toLowerCase();
            this.list = this.templates.filter((template) => template.search?.includes(name));
        } else {
            this.list = this.templates;
        }
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSelect(template: any): void {
        this.ref.close(template);
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
