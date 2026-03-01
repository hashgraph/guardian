import { Component, ElementRef, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ToolsService } from 'src/app/services/tools.service';

/**
 * Search policy dialog.
 */
@Component({
    selector: 'search-tool-dialog',
    templateUrl: './search-tool-dialog.component.html',
    styleUrls: ['./search-tool-dialog.component.scss']
})
export class SearchToolDialog {
    public loading = false;
    public name = '';
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl(''),
    });
    public tools: any[] = [];
    public list: any[] = [];
    public count: number = 0;

    public isLargeSize: boolean = true;
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    constructor(
        public ref: DynamicDialogRef,
        private toolsService: ToolsService,
        public config: DynamicDialogConfig,
    ) {
        this.name = this.config.data.name;
        this.filtersForm.setValue({
            name: this.config.data.name
        });
        this.tools = [];
        this.list = [];
    }

    ngOnInit() {
        this.load();
    }

    public load() {
        this.list = [];
        this.loading = true;
        this.count = 0;
        this.toolsService
            .menuList()
            .subscribe((tools) => {
                this.tools = tools || [];
                this.list = [];
                for (const t of this.tools) {
                    t.search = t.name?.toLowerCase();
                }
                this.onFilters();
                this.loading = false;
            }, (error) => {
                this.tools = [];
                this.list = [];
                this.loading = false;
                console.error(error);
            });
    }

    public onFilters() {
        let name:string = this.filtersForm.value?.name;
        if (name) {
            name = name.toLowerCase();
            this.list = this.tools.filter((t) => t.search?.indexOf(name) !== -1);
        } else {
            this.list = this.tools;
        }
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSelect(messageId: string): void {
        this.ref.close(messageId);
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
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
