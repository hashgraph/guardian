import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { TagsHistory } from "../models/tags-history";
import { TagMapItem } from "../models/tag-map-item";
import { TagItem } from "../models/tag-item";

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

    constructor(
        public dialogRef: MatDialogRef<TagsExplorerDialog>,
        public dialog: MatDialog,
        private fb: FormBuilder,
        private tagsService: TagsService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.history = data.history;
        this.owner = this.history.owner;
        this.select = this.history.get();
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
        if( this.open == item) {
            this.open = undefined;
        } else {
            this.open = item;
        }
    }

    public onAdd() {
        const dialogRef = this.dialog.open(TagCreateDialog, {
            width: '600px',
            panelClass: 'g-dialog',
            disableClose: true
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
            this.select = this.history.get(this.select);
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
            this.select = this.history.get(this.select);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
