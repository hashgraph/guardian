import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ModuleStatus } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { SchemaTemplateGridItem, SchemaTemplatesService } from 'src/app/services/schema-templates.service';

@Component({
    selector: 'apply-schema-template-dialog',
    templateUrl: './apply-schema-template-dialog.component.html',
    styleUrls: ['./apply-schema-template-dialog.component.scss'],
    standalone: false
})
export class ApplySchemaTemplateDialog implements OnInit, OnDestroy {
    public loading = true;
    public applying = false;
    public policy: any;
    public list: SchemaTemplateGridItem[] = [];
    public selectedTemplateId: string | null = null;
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl('')
    });
    private readonly destroy$ = new Subject<void>();

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private readonly templatesService: SchemaTemplatesService
    ) {
        this.policy = this.config.data?.policy;
    }

    public ngOnInit(): void {
        this.filtersForm.get('name')?.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((value) => {
                this.selectedTemplateId = null;
                this.loadTemplates(String(value || '').trim());
            });
        this.loadTemplates();
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public loadTemplates(search: string = ''): void {
        this.loading = true;
        this.templatesService.page(0, 1000, search)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
            next: (response) => {
                this.list = (response.body || []).filter((template) => {
                    return template.status === ModuleStatus.DRAFT ||
                        template.status === ModuleStatus.PUBLISHED;
                });
                this.loading = false;
            },
            error: () => {
                this.list = [];
                this.loading = false;
            }
        });
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
}
