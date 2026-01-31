import { Component, OnInit } from '@angular/core';
import { ISchema, IChildSchemaDeletionBlock } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-schema-delete-dialog.',
    templateUrl: './schema-delete-dialog.component.html',
    styleUrls: ['./schema-delete-dialog.component.scss'],
})
export class SchemaDeleteDialogComponent implements OnInit {
    public loading = true;
    public header: string;
    public text: string;
    public includeChildren: boolean = false;

    public itemNames: string[] = [];
    public deletableChildren: ISchema[] = [];
    public blockedChildren: IChildSchemaDeletionBlock[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data.header;
        this.text = this.config.data.text;

        this.itemNames = this.config.data.itemNames;
        this.deletableChildren = this.config.data?.deletableChildren;
        this.blockedChildren = this.config.data?.blockedChildren;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClose(): void {
        this.ref.close({ action: 'Close', includeChildren: this.includeChildren });
    }

    onDelete(): void {
        this.ref.close({ action: 'Delete', includeChildren: this.includeChildren });
    }
}
