import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { TagsHistory } from "../models/tags-history";
import { TagMapItem } from "../models/tag-map-item";
import { TagItem } from "../models/tag-item";
import * as moment from 'moment';
import { VCViewerDialog } from '../../schema-engine/vc-dialog/vc-dialog.component';

/**
 * Dialog for creating tokens.
 */
@Component({
    selector: 'tags-explorer-dialog',
    templateUrl: './tags-explorer-dialog.component.html',
    styleUrls: ['./tags-explorer-dialog.component.css']
})
export class TagsExplorerDialog {
    public loading = false;
    public started = false;
    public title: string = "Tags";
    public description: string = "";
    public select: TagMapItem | undefined;
    public open: TagItem | undefined;
    public history: TagsHistory;
    public owner: string;
    public time: string | undefined;
    public tab: number = 1;
    public tagsService: TagsService;
    public schemas: any[] = [];

    constructor(
        public dialogRef: MatDialogRef<TagsExplorerDialog>,
        public dialog: MatDialog,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schemas = data?.schemas;
        this.tagsService = data.service;
        this.history = data.history;
        this.owner = this.history.owner;
        this.select = this.history.getItem();
        this.setTime(this.history.time);
        this.tab = 1;
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    public onSelect(item: TagMapItem) {
        this.select = item;
    }

    public onOpen(item: TagItem) {
        if (this.open == item) {
            this.open = undefined;
        } else {
            this.open = item;
        }
    }

    public onAdd() {
        const dialogRef = this.dialog.open(TagCreateDialog, {
            width: '800px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                schemas: this.schemas
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.create(result);
            }
        });
    }

    private create(tag: any) {
        tag = this.history.create(tag);
        this.loading = true;
        this.tagsService.create(tag).subscribe((data) => {
            this.history.add(data);
            if (this.tab === 1) {
                this.select = this.history.getItem(this.select);
            } else {
                this.select = this.history.getHistory(this.select);
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public onDelete(item: TagItem) {
        this.loading = true;
        this.tagsService.delete(item.uuid).subscribe((data) => {
            this.history.delete(item);
            if (this.tab === 1) {
                this.select = this.history.getItem(this.select);
            } else {
                this.select = this.history.getHistory(this.select);
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public onUpdate() {
        this.loading = true;
        this.tagsService.synchronization(this.history.entity, this.history.target).subscribe((data) => {
            this.history.setData(data.tags);
            this.history.setDate(data.refreshDate);
            if (this.tab === 1) {
                this.select = this.history.getItem(this.select);
            } else {
                this.select = this.history.getHistory(this.select);
            }
            this.setTime(this.history.time);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public openTab(tab: number) {
        this.tab = tab;
        if (this.tab === 1) {
            this.select = this.history.getItem();
        } else {
            this.select = this.history.getHistory();
        }
    }

    private setTime(time: string | undefined) {
        if (time) {
            const m = moment(time);
            if (m.isValid()) {
                this.time = m.fromNow();
            } else {
                this.time = undefined;
            }
        } else {
            this.time = undefined;
        }
    }

    public json(doc: any): string {
        return JSON.stringify(doc, null, 2);
    }

    public openVCDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document,
                title: title,
                type: 'Document',
                viewDocument: false,
                toggle: false
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }
}
