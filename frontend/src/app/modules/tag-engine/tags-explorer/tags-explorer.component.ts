import { Component, Input, SimpleChanges } from '@angular/core';
import { TagsService } from 'src/app/services/tag.service';
import { TagCreateDialog } from '../tags-create-dialog/tags-create-dialog.component';
import { TagsExplorerDialog } from '../tags-explorer-dialog/tags-explorer-dialog.component';
import { TagsHistory } from '../models/tags-history';
import { LocationType, Schema, UserPermissions } from '@guardian/interfaces';
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
    @Input('user') user!: UserPermissions;
    @Input('location') location!: LocationType;

    public loading = false;
    public history!: TagsHistory;

    constructor(public dialog: DialogService) {
    }

    public get compact(): boolean {
        if (this.user) {
            return (
                this.user.TAGS_TAG_CREATE &&
                this.user.location !== LocationType.REMOTE &&
                this.history.location !== LocationType.REMOTE &&
                (!this.history || !this.history.top)
            );
        } else {
            return (!this.history || !this.history.top);
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.data) {
            this.history = new TagsHistory(
                this.data.entity || this.entity,
                this.data.target || this.target,
                this.owner,
                this.location || LocationType.LOCAL
            );
            this.history.setData(this.data.tags);
            this.history.setDate(this.data.refreshDate);
        } else {
            this.history = new TagsHistory(
                this.entity,
                this.target,
                this.owner,
                this.location || LocationType.LOCAL
            );
        }
    }

    public onOpen() {
        const dialogRef = this.dialog.open(TagsExplorerDialog, {
            width: '750px',
            height: '600px',
            closable: true,
            header: 'Tags',
            data: {
                user: this.user,
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
