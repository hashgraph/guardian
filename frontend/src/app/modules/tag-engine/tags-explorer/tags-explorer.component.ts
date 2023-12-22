import { Component, Input, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TagsService } from 'src/app/services/tag.service';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsExplorerDialog } from '../tags-explorer-dialog/tags-explorer-dialog.component';
import { TagsHistory } from '../models/tags-history';
import { Schema } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';

/**
 * Hedera explorer.
 */
@Component({
    selector: 'tags-explorer',
    templateUrl: './tags-explorer.component.html',
    styleUrls: ['./tags-explorer.component.scss']
})
export class TagsExplorer {
    @Input('data') data!: any;
    @Input('owner') owner!: any;
    @Input('entity') entity!: any;
    @Input('target') target!: any;
    @Input('service') tagsService!: TagsService;
    @Input('schemas') schemas!: Schema[];

    public loading = false;
    public history!: TagsHistory;

    constructor(public dialog: DialogService) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.data) {
            this.history = new TagsHistory(
                this.data.entity || this.entity,
                this.data.target || this.target,
                this.owner
            );
            this.history.setData(this.data.tags);
            this.history.setDate(this.data.refreshDate);
        } else {
            this.history = new TagsHistory(
                this.entity,
                this.target,
                this.owner
            );
        }
    }

    public onOpen() {
        const dialogRef = this.dialog.open(TagsExplorerDialog, {
            width: '750px',
            height: '500px',
            closable: false,
            header: 'Tags',
            data: {
                service: this.tagsService,
                history: this.history,
                schemas: this.schemas
            }
        });
        dialogRef
            .onClose
            .subscribe(async (result) =>
                result ? this.tagsService.tagsUpdated$.next() : null
            );
    }

    public onAdd() {
        const dialogRef = this.dialog.open(TagCreateDialog, {
            width: '750px',
            closable: true,
            header: 'New Tag',
            data: {
                schemas: this.schemas
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
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
            this.tagsService.tagsUpdated$.next();
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}
