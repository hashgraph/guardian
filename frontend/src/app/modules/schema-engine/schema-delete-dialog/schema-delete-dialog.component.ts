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
    public buttons: {
        name: string,
        class: string,
    }[];
    public includeChildren: boolean = false;

    public deletableChildren: ISchema[] = [];
    public blockedChildren: IChildSchemaDeletionBlock[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data.header;
        this.text = this.config.data.text;
        this.buttons = this.config.data.buttons;

        this.deletableChildren = this.config.data?.deletableChildren?.map((item: any) => item.name);
        this.blockedChildren = this.config.data?.blockedChildren?.map((item: any) => ({
            schema: item.schema,
            blockingSchemas: item.blockingSchemas?.map((blockingSchema: ISchema) => blockingSchema.name)
        }));
    }

    ngOnInit() {
        this.loading = false;
    }

    onClick(button?: any): void {
        this.ref.close({ action: button?.name, includeChildren: this.includeChildren });
    }
}
