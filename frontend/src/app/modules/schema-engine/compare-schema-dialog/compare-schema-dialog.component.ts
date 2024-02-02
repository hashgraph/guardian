import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'compare-schema-dialog',
    templateUrl: './compare-schema-dialog.component.html',
    styleUrls: ['./compare-schema-dialog.component.scss'],
})
export class CompareSchemaDialog {
    loading = true;

    schema!: any;
    schemas: any[];

    schemaId1!: any;
    schemaId2!: any;

    list1: any[];
    list2: any[];

    policies: any[];

    topicId1!: any;
    topicId2!: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.schema = this.config.data.schema;
        this.schemas = this.config.data.schemas || [];
        this.policies = this.config.data.policies || [];
        this.schemaId1 = this.schema?.id;
        this.list1 = this.schemas;
        this.list2 = this.schemas;
    }

    ngOnInit() {
        this.loading = false;
    }

    setData(data: any) {
    }

    onClose(): void {
        this.ref.close(false);
    }

    onCompare() {
        this.ref.close({
            schemaId1: this.schemaId1,
            schemaId2: this.schemaId2,
        });
    }

    onChange() {
        this.list1 = this.schemas.filter((s) => {
            if (this.topicId1) {
                return s.id !== this.schemaId2 && s.topicId === this.topicId1;
            } else {
                return s.id !== this.schemaId2;
            }
        });
        this.list2 = this.schemas.filter((s) => {
            if (this.topicId2) {
                return s.id !== this.schemaId1 && s.topicId === this.topicId2;
            } else {
                return s.id !== this.schemaId1;
            }
        });
    }
}
