import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ModuleStatus } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SchemaTemplateGridItem, SchemaTemplatesService } from 'src/app/services/schema-templates.service';

@Component({
    selector: 'apply-schema-template-dialog',
    templateUrl: './apply-schema-template-dialog.component.html',
    styleUrls: ['./apply-schema-template-dialog.component.scss'],
    standalone: false
})
export class ApplySchemaTemplateDialog implements OnInit {
    public loading = true;
    public applying = false;
    public policy: any;
    public templates: SchemaTemplateGridItem[] = [];
    public list: SchemaTemplateGridItem[] = [];
    public selectedTemplateId: string | null = null;
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl('')
    });

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private readonly templatesService: SchemaTemplatesService
    ) {
        this.policy = this.config.data?.policy;
    }

    public ngOnInit(): void {
        this.loadTemplates();
    }

    public loadTemplates(): void {
        this.loading = true;
        this.templatesService.page(0, 1000).subscribe({
            next: (response) => {
                this.templates = (response.body || []).filter((template) => {
                    return template.status === ModuleStatus.DRAFT ||
                        template.status === ModuleStatus.PUBLISHED;
                });
                this.applyFilters();
                this.loading = false;
            },
            error: () => {
                this.templates = [];
                this.list = [];
                this.loading = false;
            }
        });
    }

    public applyFilters(): void {
        const name = this.filtersForm.value?.name?.trim()?.toLowerCase();
        this.list = name
            ? this.templates.filter((template) => template.name?.toLowerCase().includes(name))
            : [...this.templates];
    }

    public selectTemplate(template: SchemaTemplateGridItem): void {
        this.selectedTemplateId = this.getTemplateId(template);
    }

    public getTemplateId(template: SchemaTemplateGridItem): string | null {
        return template.id || (template as any)._id || null;
    }

    public applyTemplate(): void {
        if (!this.selectedTemplateId || !this.policy?.id || this.applying) {
            return;
        }
        this.applying = true;
        this.templatesService.pushApply(this.selectedTemplateId, this.policy.id).subscribe({
            next: (task) => {
                this.ref.close(task);
            },
            error: () => {
                this.applying = false;
            }
        });
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public getStatusLabel(status?: ModuleStatus): string {
        switch (status) {
            case ModuleStatus.PUBLISHED:
                return 'Published';
            case ModuleStatus.DRY_RUN:
                return 'Dry Run';
            case ModuleStatus.DRAFT:
            default:
                return 'Draft';
        }
    }
}
