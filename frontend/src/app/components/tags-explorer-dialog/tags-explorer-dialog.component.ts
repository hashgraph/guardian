import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsService } from 'src/app/services/tag.service';

/**
 * Dialog for creating tokens.
 */
@Component({
    selector: 'tags-explorer-dialog',
    templateUrl: './tags-explorer-dialog.component.html',
    styleUrls: ['./tags-explorer-dialog.component.css']
})
export class TagsExplorerDialog {
    loading = false;
    started = false;
    title: string = "Tags";
    description: string = "";
    tags: any[];
    select: any;
    owner: any;
    entity: any;
    target: any;

    constructor(
        public dialogRef: MatDialogRef<TagsExplorerDialog>,
        public dialog: MatDialog,
        private fb: FormBuilder,
        private tagsService: TagsService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (data) {
            this.tags = data.tags || [];
            this.owner = data.owner;
            this.entity = data.entity;
            this.target = data.target;
        } else {
            this.tags = [];
        }
        this.select = this.tags[0];
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    public onSelect(item: any) {
        this.select = item;
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
        console.log(tag);
        tag.entity = this.entity;
        tag.target = this.target;
        this.loading = true;
        this.tagsService.create(tag).subscribe((data) => {
            const tag = this.tags.find(t => t.name === data.name);
            if (tag) {
                tag.items.push(data);
                tag.count = tag.items.length;
            } else {
                this.tags.push({
                    name: data.name,
                    count: 1,
                    items: [data]
                })
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
