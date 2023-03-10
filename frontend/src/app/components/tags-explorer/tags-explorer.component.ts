import { Component, Input, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TagsService } from 'src/app/services/tag.service';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsExplorerDialog } from '../tags-explorer-dialog/tags-explorer-dialog.component';

/**
 * Hedera explorer.
 */
@Component({
    selector: 'tags-explorer',
    templateUrl: './tags-explorer.component.html',
    styleUrls: ['./tags-explorer.component.css']
})
export class TagsExplorer {
    @Input('data') data!: any;
    @Input('owner') owner!: any;

    public history: any[];
    public tags: any[];
    public main!: any;
    public entity!: any;
    public target!: any;
    public loading = false;

    constructor(
        public dialog: MatDialog,
        private tagsService: TagsService
    ) {
        this.history = [];
        this.main = null;
        this.tags = [];
        this.entity = '';
        this.target = '';
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.data) {
            this.update(this.data);
        } else {
            this.main = null;
            this.tags = [];
            this.entity = '';
            this.target = '';
        }
    }

    private update(data: any) {
        this.history = data.tags;
        this.entity = data.entity;
        this.target = data.target;

        this.tags = this.mapping(this.history);
        this.main = this.getMain(this.tags);
    }

    private mapping(tags: any[]) {
        const idMap = new Map<string, any>();
        for (const tag of tags) {
            idMap.set(tag.uuid, tag);
        }
        const tagMap = new Map<string, any[]>();
        for (const tag of idMap.values()) {
            if (tag.operation !== 'DELETE') {
                const m = tagMap.get(tag.name) || [];
                m.push(tag);
                tagMap.set(tag.name, m);
            }
        }
        const result = [];
        for (const [key, value] of tagMap.entries()) {
            const owner = !!value.find((e: any) => e.owner === this.owner);
            result.push({
                name: key,
                owner,
                count: value.length,
                items: value
            })
        }
        return result;
    }

    private getMain(tags: any[]) {
        let main = tags[0];
        for (const tag of tags) {
            if (tag.count >= main.count) {
                main = tag;
            }
        }
        return main;
    }

    public onOpen() {
        const dialogRef = this.dialog.open(TagsExplorerDialog, {
            width: '800px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                tags: this.tags,
                owner: this.owner,
                entity: this.entity,
                target: this.target
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            return;
        });
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
            this.history.push(data);
            this.tags = this.mapping(this.history);
            this.main = this.getMain(this.tags);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}