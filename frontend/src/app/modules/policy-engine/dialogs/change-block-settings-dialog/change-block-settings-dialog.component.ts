import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyBlock } from '../../structures';

@Component({
    selector: 'change-block-settings-dialog',
    templateUrl: './change-block-settings-dialog.component.html',
    styleUrls: ['./change-block-settings-dialog.component.scss'],
})
export class ChangeBlockSettingsDialog {
    public loading = true;
    public title: string;
    public action: string;
    public blocks: PolicyBlock[];
    public list: any[];
    public readonly: boolean;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title || '';
        this.action = this.config.data?.action || '';
        this.blocks = this.config.data?.blocks || [];

        this.list = [];
        for (const block of this.blocks) {
            this.list.push({
                name: block.tag || block.id,
                type: block.blockType,
                selected: true,
                block
            })
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        const result = this.list.filter((i) => i.selected).map((i) => i.block);
        this.ref.close(result);
    }

    public onSelect(item: any) {
        item.selected = !item.selected;
    }
}
